const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const getPlayers = () => global.gameStorage.players;

// Register a new player
router.post('/register', (req, res) => {
  const { name, level } = req.body;
  
  if (!name || !level) {
    return res.status(400).json({ error: 'Name and level are required' });
  }

  const playerId = uuidv4();
  const players = getPlayers();
  
  players.set(playerId, {
    id: playerId,
    name,
    level,
    score: 0, // Starting score
    gamesPlayed: 0,
    gamesWon: 0,
    createdAt: new Date(),
    lastActive: new Date()
  });

  res.json({ 
    playerId, 
    name, 
    level,
    score: 0 
  });
});

// Get player info
router.get('/:playerId', (req, res) => {
  const players = getPlayers();
  const player = players.get(req.params.playerId);
  
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  // Update last active
  player.lastActive = new Date();

  res.json(player);
});

module.exports = router;
