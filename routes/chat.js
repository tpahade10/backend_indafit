const express = require('express');
const axios = require('axios');
const Conversation = require('../models/Conversation');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Chat with a bot
router.post('/chat', authMiddleware, async (req, res) => {
  const { message, botName } =await req.body;
  const userId = req.user.id;

  if (!message || !botName) {
    return res.status(400).json({ message: 'Message and botName are required' });
  }

  try {
    // Get the conversation history to provide context
    let conversation = await Conversation.findOne({ userId, type: 'chat', botName });
    const messages = conversation ? conversation.messages : [];

    // Prepare the prompt with conversation history
    const promptMessages = messages.map((msg) => `${msg.sender}: ${msg.text}`).join('\n');
    const fullPrompt = `${promptMessages}\nuser: ${message}\n${botName}:`;

    // Call Mistral API for the bot's response
    const response = await axios.post(
      'https://api.mixtral.ai/v1/completions',
      {
        model: 'mistral-tiny',
        prompt: `You are ${botName}, a helpful assistant. Respond to the user's message in a conversational tone:\n\n${fullPrompt}`,
        max_tokens: 500,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const botResponse = response.data.choices[0].text.trim();

    // Save the conversation
    const userMessage = { text: message, sender: 'user' };
    const botMessage = { text: botResponse, sender: 'bot' };

    if (!conversation) {
      conversation = new Conversation({
        userId,
        type: 'chat',
        botName,
        messages: [userMessage, botMessage],
      });
    } else {
      conversation.messages.push(userMessage, botMessage);
    }

    await conversation.save();

    res.json({ response: botResponse });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get chat history for a specific bot
router.get('/history/:botName', authMiddleware, async (req, res) => {
  const userId =await req.user.id;
  const { botName } =await req.params;

  try {
    const conversation = await Conversation.findOne({ userId, type: 'chat', botName });
    if (!conversation) {
      return res.json({ messages: [] });
    }
    res.json({ messages: conversation.messages });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;