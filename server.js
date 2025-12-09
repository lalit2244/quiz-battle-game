const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage
const storage = {
  players: new Map(),
  waitingQueue: new Map(),
  gameSessions: new Map(),
  matchRequests: new Map() // fromId -> [toId array]
};

global.gameStorage = storage;

// Load question bank
const questionBank = require('./questions');
global.questionBank = questionBank;

// Routes
const playerRoutes = require('./routes/player');
const matchRoutes = require('./routes/match');
const gameRoutes = require('./routes/game');

app.use('/api/player', playerRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/game', gameRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Quiz Game API is running' });
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🎮 Frontend available at http://localhost:${PORT}`);
  console.log(`📝 API endpoints:`);
  console.log(`   - POST /api/player/register`);
  console.log(`   - GET  /api/player/:playerId`);
  console.log(`   - GET  /api/match/nearby/:playerId`);
  console.log(`   - POST /api/match/request`);
  console.log(`   - POST /api/match/accept`);
  console.log(`   - POST /api/match/decline`);
  console.log(`   - GET  /api/match/requests/:playerId`);
  console.log(`   - GET  /api/match/status/:playerId`);
  console.log(`   - POST /api/game/answer`);
  console.log(`   - GET  /api/game/result/:sessionId`);
});
