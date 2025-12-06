const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Access global storage
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
    createdAt: new Date()
  });

  res.json({ playerId, name, level });
});

// Get player info
router.get('/:playerId', (req, res) => {
  const players = getPlayers();
  const player = players.get(req.params.playerId);
  
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  res.json(player);
});

module.exports = router;