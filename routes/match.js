const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const getPlayers = () => global.gameStorage.players;
const getGameSessions = () => global.gameStorage.gameSessions;
const getMatchRequests = () => global.gameStorage.matchRequests;
const getQuestionBank = () => global.questionBank;

// Get nearby players (within score range)
router.get('/nearby/:playerId', (req, res) => {
  const players = getPlayers();
  const currentPlayer = players.get(req.params.playerId);
  
  if (!currentPlayer) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const nearbyPlayers = [];
  const scoreRange = 200;
  
  players.forEach((player) => {
    if (player.id !== currentPlayer.id && 
        player.level === currentPlayer.level &&
        Math.abs(player.score - currentPlayer.score) <= scoreRange) {
      
      player.lastActive = new Date();
      
      nearbyPlayers.push({
        id: player.id,
        name: player.name,
        level: player.level,
        score: player.score,
        gamesPlayed: player.gamesPlayed || 0
      });
    }
  });

  nearbyPlayers.sort((a, b) => {
    const diffA = Math.abs(a.score - currentPlayer.score);
    const diffB = Math.abs(b.score - currentPlayer.score);
    return diffA - diffB;
  });

  res.json({ players: nearbyPlayers.slice(0, 10) });
});

// Send match request
router.post('/request', (req, res) => {
  const { fromId, toId } = req.body;
  
  if (!fromId || !toId) {
    return res.status(400).json({ error: 'fromId and toId are required' });
  }

  const players = getPlayers();
  const fromPlayer = players.get(fromId);
  const toPlayer = players.get(toId);
  
  if (!fromPlayer || !toPlayer) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const matchRequests = getMatchRequests();
  
  if (!matchRequests.has(toId)) {
    matchRequests.set(toId, []);
  }

  const requests = matchRequests.get(toId);
  
  const existingRequest = requests.find(r => r.fromId === fromId);
  if (existingRequest) {
    return res.json({ success: true, message: 'Request already sent' });
  }

  requests.push({
    fromId,
    fromName: fromPlayer.name,
    fromLevel: fromPlayer.level,
    fromScore: fromPlayer.score,
    timestamp: new Date()
  });

  console.log(`✉️ Match request: ${fromPlayer.name} → ${toPlayer.name}`);

  res.json({ success: true, message: 'Match request sent' });
});

// Get pending requests for a player
router.get('/requests/:playerId', (req, res) => {
  const matchRequests = getMatchRequests();
  const requests = matchRequests.get(req.params.playerId) || [];
  
  res.json({ requests });
});

// Accept match request
router.post('/accept', (req, res) => {
  const { playerId, fromId } = req.body;
  
  if (!playerId || !fromId) {
    return res.status(400).json({ error: 'playerId and fromId are required' });
  }

  const players = getPlayers();
  const player = players.get(playerId);
  const opponent = players.get(fromId);
  
  if (!player || !opponent) {
    return res.status(404).json({ error: 'Player not found' });
  }

  // Remove the request
  const matchRequests = getMatchRequests();
  const requests = matchRequests.get(playerId) || [];
  matchRequests.set(playerId, requests.filter(r => r.fromId !== fromId));

  // Create game session
  const sessionId = uuidv4();
  const questions = getRandomQuestions(player.level, 10);
  
  const gameSessions = getGameSessions();
  gameSessions.set(sessionId, {
    id: sessionId,
    player1: playerId,
    player2: fromId,
    level: player.level,
    questions,
    answers: {
      [playerId]: {},
      [fromId]: {}
    },
    startedAt: new Date(),
    completed: false
  });

  console.log(`🎮 Match accepted: ${player.name} vs ${opponent.name}`);

  // IMPORTANT: Notify BOTH players with matchInfo
  // The person who accepted (playerId)
  players.get(playerId).matchInfo = {
    matched: true,
    sessionId,
    opponent: opponent.name,
    questions
  };
  
  // The person who sent request (fromId) - THIS WAS MISSING PROPER STATE
  players.get(fromId).matchInfo = {
    matched: true,
    sessionId,
    opponent: player.name,
    questions
  };

  res.json({ 
    success: true,
    sessionId,
    opponent: opponent.name,
    questions 
  });
});

// Decline match request
router.post('/decline', (req, res) => {
  const { playerId, fromId } = req.body;
  
  if (!playerId || !fromId) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const matchRequests = getMatchRequests();
  const requests = matchRequests.get(playerId) || [];
  matchRequests.set(playerId, requests.filter(r => r.fromId !== fromId));

  console.log(`❌ Match declined by ${playerId}`);

  res.json({ success: true, message: 'Request declined' });
});

// Check match status (for accepted matches)
router.get('/status/:playerId', (req, res) => {
  const players = getPlayers();
  const player = players.get(req.params.playerId);
  
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  if (player.matchInfo) {
    const info = player.matchInfo;
    delete player.matchInfo; // Clear after reading
    console.log(`📢 Sending match info to ${player.name}`);
    return res.json(info);
  }

  res.json({ matched: false });
});

function getRandomQuestions(level, count) {
  const questionBank = getQuestionBank();
  const levelQuestions = questionBank[level] || questionBank[1];
  const shuffled = [...levelQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

module.exports = router;
