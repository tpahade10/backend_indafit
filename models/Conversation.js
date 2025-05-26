const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: String,
  sender: { type: String, enum: ['user', 'bot'] },
  sources: [{ title: String, url: String }],
  timestamp: { type: Date, default: Date.now },
});

const conversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['search', 'chat'], required: true }, // 'search' for Explore, 'chat' for Chat screen
  botName: { type: String }, // For Chat screen conversations
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

conversationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Conversation', conversationSchema);