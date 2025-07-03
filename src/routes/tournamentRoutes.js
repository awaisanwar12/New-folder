const express = require('express');
const tournamentController = require('../controllers/tournamentController');

const router = express.Router();

// Route to get filtered tournaments
router.get('/tournaments', tournamentController.getFilteredTournaments);

// Route to get participants for a specific tournament
router.get('/tournaments/:tournamentId/participants', tournamentController.getTournamentParticipants);

module.exports = router;
