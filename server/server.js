const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const translateRoutes = require('./routes/translateRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend flexibility
app.use(cors());

// Middleware for parsing JSON and urlencoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api', translateRoutes);

// Fallback for SPA routing or basic error index redirects
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🚀 Language Translator Server is running`);
  console.log(`🔌 Port: ${PORT}`);
  console.log(`🌐 Local: http://localhost:${PORT}`);
  console.log(`========================================`);
});
