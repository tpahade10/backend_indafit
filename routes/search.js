const express = require('express');
const axios = require('axios');
const Conversation = require('../models/Conversation');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Search and summarize
router.post('/search', authMiddleware, async (req, res) => {
  const { query } = req.body;
  const userId = req.user.id;

  if (!query) {
    return res.status(400).json({ message: 'Query is required' });
  }

  try {
    // Fetch search results from Tavily
    const tavilyResponse = await axios.post(
      'https://api.tavily.com/search',
      {
        api_key: process.env.TAVILY_API_KEY,
        query: query,
        max_results: 5,
        search_depth: 'basic',
        include_raw_content: false,
        include_images: false,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const searchResults = tavilyResponse.data.results;
    if (!searchResults || searchResults.length === 0) {
      return res.status(404).json({ message: 'No search results found' });
    }

    const contentToSummarize = searchResults.map((result) => result.content).join('\n\n');
    const sources = searchResults.map((result) => ({
      title: result.title,
      url: result.url,
    }));

    // Summarize using Mistral API
    const summaryResponse = await axios.post(
      'https://api.mixtral.ai/v1/completions',
      {
        model: 'mistral-tiny',
        prompt: `You are a helpful assistant. Summarize the following content in a concise, conversational tone. Be precise and avoid adding unsupported claims:\n\n${contentToSummarize}`,
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

    const summary = summaryResponse.data.choices[0].text.trim();

    // Save the conversation to the database
    let conversation = await Conversation.findOne({ userId, type: 'search' });
    const userMessage = { text: query, sender: 'user' };
    const botMessage = { text: summary, sender: 'bot', sources };

    if (!conversation) {
      conversation = new Conversation({
        userId,
        type: 'search',
        messages: [userMessage, botMessage],
      });
    } else {
      conversation.messages.push(userMessage, botMessage);
    }

    await conversation.save();

    res.json({ summary, sources });
  } catch (error) {
    console.error('Error in search:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get conversation history for the Explore page
router.get('/history', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const conversation = await Conversation.findOne({ userId, type: 'search' });
    if (!conversation) {
      return res.json({ messages: [] });
    }
    res.json({ messages: conversation.messages });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;