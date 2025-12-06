const express = require('express');
const router = express.Router();

// Access global storage
const getGameSessions = () => global.gameStorage.gameSessions;

// Submit an answer
router.post('/answer', (req, res) => {
  const { sessionId, playerId, questionId, answer, timeTaken } = req.body;
  
  if (!sessionId || !playerId || !questionId || !answer) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const gameSessions = getGameSessions();
  const session = gameSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Find the correct answer
  const question = session.questions.find(q => q.id === questionId);
  const isCorrect = question && question.correctAnswer === answer;

  // Store the answer
  session.answers[playerId][questionId] = {
    answer,
    isCorrect,
    timeTaken: timeTaken || 0,
    answeredAt: new Date()
  };

  res.json({ 
    success: true, 
    isCorrect,
    correctAnswer: question ? question.correctAnswer : null 
  });
});

// Get game result
router.get('/result/:sessionId', (req, res) => {
  const gameSessions = getGameSessions();
  const session = gameSessions.get(req.params.sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Calculate scores
  const player1Answers = session.answers[session.player1];
  const player2Answers = session.answers[session.player2];

  const player1Score = calculateScore(player1Answers);
  const player2Score = calculateScore(player2Answers);

  // Determine winner
  let winner;
  if (player1Score.correctAnswers > player2Score.correctAnswers) {
    winner = session.player1;
  } else if (player2Score.correctAnswers > player1Score.correctAnswers) {
    winner = session.player2;
  } else {
    // Tie on correct answers, check time
    winner = player1Score.totalTime < player2Score.totalTime ? 
      session.player1 : session.player2;
  }

  session.completed = true;
  session.winner = winner;

  res.json({
    sessionId: session.id,
    player1: session.player1,
    player2: session.player2,
    player1Score,
    player2Score,
    winner,
    completedAt: new Date()
  });
});

// Helper function to calculate score
function calculateScore(answers) {
  let correctAnswers = 0;
  let totalTime = 0;

  Object.values(answers).forEach(answer => {
    if (answer.isCorrect) correctAnswers++;
    totalTime += answer.timeTaken;
  });

  return {
    correctAnswers,
    totalTime,
    averageTime: totalTime / Object.keys(answers).length
  };
}

module.exports = router;