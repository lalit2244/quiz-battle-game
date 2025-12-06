const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Access global storage
const getPlayers = () => global.gameStorage.players;
const getWaitingQueue = () => global.gameStorage.waitingQueue;
const getGameSessions = () => global.gameStorage.gameSessions;
const getQuestionBank = () => global.questionBank;

// Find a match for a player
router.post('/find', (req, res) => {
  const { playerId, level } = req.body;
  
  if (!playerId || !level) {
    return res.status(400).json({ error: 'PlayerId and level are required' });
  }

  const players = getPlayers();
  const player = players.get(playerId);
  
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const waitingQueue = getWaitingQueue();
  
  // Check if there's already a player waiting at this level
  if (!waitingQueue.has(level)) {
    waitingQueue.set(level, []);
  }

  const queue = waitingQueue.get(level);
  
  if (queue.length > 0) {
    // Match found! Create game session
    const opponentId = queue.shift();
    const opponent = players.get(opponentId);
    
    const sessionId = uuidv4();
    const questions = getRandomQuestions(level, 10);
    
    const gameSessions = getGameSessions();
    gameSessions.set(sessionId, {
      id: sessionId,
      player1: playerId,
      player2: opponentId,
      level,
      questions,
      answers: {
        [playerId]: {},
        [opponentId]: {}
      },
      startedAt: new Date(),
      completed: false
    });

    // Store match info temporarily for both players
    players.get(playerId).matchInfo = {
      matched: true,
      sessionId,
      opponent: opponent.name,
      questions
    };
    
    players.get(opponentId).matchInfo = {
      matched: true,
      sessionId,
      opponent: player.name,
      questions
    };

    res.json({ 
      matched: true, 
      sessionId, 
      opponent: opponent.name,
      questions 
    });
  } else {
    // No match yet, add to queue
    queue.push(playerId);
    res.json({ matched: false, message: 'Waiting for opponent' });
  }
});

// Check match status
router.get('/status/:playerId', (req, res) => {
  const players = getPlayers();
  const player = players.get(req.params.playerId);
  
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  if (player.matchInfo) {
    const info = player.matchInfo;
    delete player.matchInfo; // Clear after reading
    return res.json(info);
  }

  res.json({ matched: false });
});

// Helper function to get random questions
function getRandomQuestions(level, count) {
  const questionBank = getQuestionBank();
  const levelQuestions = questionBank[level] || questionBank[1];
  const shuffled = [...levelQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

module.exports = router;