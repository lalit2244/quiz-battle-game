const express = require('express');
const router = express.Router();

const getGameSessions = () => global.gameStorage.gameSessions;
const getPlayers = () => global.gameStorage.players;

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

  const question = session.questions.find(q => q.id === questionId);
  const isCorrect = question && question.correctAnswer === answer;

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

  const player1Answers = session.answers[session.player1];
  const player2Answers = session.answers[session.player2];

  const player1Score = calculateScore(player1Answers);
  const player2Score = calculateScore(player2Answers);

  // Determine winner
  let winner;
  let winReason;
  
  if (player1Score.correctAnswers > player2Score.correctAnswers) {
    winner = session.player1;
    winReason = 'more_correct_answers';
  } else if (player2Score.correctAnswers > player1Score.correctAnswers) {
    winner = session.player2;
    winReason = 'more_correct_answers';
  } else {
    if (player1Score.totalTime < player2Score.totalTime) {
      winner = session.player1;
      winReason = 'faster_time';
    } else if (player2Score.totalTime < player1Score.totalTime) {
      winner = session.player2;
      winReason = 'faster_time';
    } else {
      winner = session.player1;
      winReason = 'tie';
    }
  }

  session.completed = true;
  session.winner = winner;

  // Update player statistics
  const players = getPlayers();
  const player1 = players.get(session.player1);
  const player2 = players.get(session.player2);

  if (player1) {
    player1.gamesPlayed = (player1.gamesPlayed || 0) + 1;
    if (winner === session.player1) {
      player1.gamesWon = (player1.gamesWon || 0) + 1;
      player1.score = (player1.score || 0) + 100; // Winner gets 100 points
    } else {
      player1.score = (player1.score || 0) + 10; // Loser gets 10 points for participation
    }
  }

  if (player2) {
    player2.gamesPlayed = (player2.gamesPlayed || 0) + 1;
    if (winner === session.player2) {
      player2.gamesWon = (player2.gamesWon || 0) + 1;
      player2.score = (player2.score || 0) + 100;
    } else {
      player2.score = (player2.score || 0) + 10;
    }
  }

  res.json({
    sessionId: session.id,
    player1: session.player1,
    player2: session.player2,
    player1Score,
    player2Score,
    winner,
    winReason,
    completedAt: new Date()
  });
});

function calculateScore(answers) {
  let correctAnswers = 0;
  let totalTime = 0;
  const answerCount = Object.keys(answers).length;

  Object.values(answers).forEach(answer => {
    if (answer.isCorrect) correctAnswers++;
    totalTime += answer.timeTaken;
  });

  return {
    correctAnswers,
    totalTime,
    averageTime: answerCount > 0 ? totalTime / answerCount : 0
  };
}

module.exports = router;
