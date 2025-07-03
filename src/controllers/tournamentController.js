const tournamentService = require('../services/tournamentService');

const getFilteredTournaments = async (req, res, next) => {
    try {
        const allTournaments = await tournamentService.fetchAllTournaments();
        const filteredData = tournamentService.filterTournaments(allTournaments);
        
        res.status(200).json({
            success: true,
            message: 'Tournaments fetched and filtered successfully.',
            data: filteredData,
        });
    } catch (error) {
        // Pass the error to the global error handler
        next(error);
    }
};

const getTournamentParticipants = async (req, res, next) => {
    try {
        const { tournamentId } = req.params;
        const participants = await tournamentService.fetchParticipantsByTournamentId(tournamentId);
        
        res.status(200).json({
            success: true,
            message: `Participants for tournament ${tournamentId} fetched successfully.`,
            data: participants,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getFilteredTournaments,
    getTournamentParticipants,
};
