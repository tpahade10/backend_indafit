const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const searchRoutes = require('./routes/search');
const chatRoutes = require('./routes/chat');
const bodyParser = require('body-parser')


// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
app.use(bodyParser.json()) // for parsing application/json


app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cors()); // Enable CORS if needed


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/chat', chatRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('Chat Backend API');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port https//:localhost:${PORT}`);
});