const axios = require('axios');
const { parseISO, isBefore, isAfter, isToday, addHours, isValid } = require('date-fns');
const config = require('../config/environment');

const TOURNAMENTS_ENDPOINT = '/api/services/app/Tournament/GetAllTournamentsFromDB';
const PARTICIPANTS_ENDPOINT = '/api/services/app/Participants/GetParticipantsByTournamentIdFromDB';

const fetchAllTournaments = async () => {
    try {
        console.log('Fetching tournaments from external API...');
        const response = await axios.get(`${config.apiBaseUrl}${TOURNAMENTS_ENDPOINT}`);
        if (!response.data || !response.data.result) {
            throw new Error('Invalid API response format from external source.');
        }
        return response.data.result;
    } catch (error) {
        console.error('Error fetching tournaments from external API:', error.message);
        throw new Error('Could not fetch tournament data from the external source.');
    }
};

const filterTournaments = (tournaments) => {
    const now = new Date();
    console.log(`Filtering based on current time: ${now.toISOString()}`);

    const upcoming = tournaments.filter(t => {
        if (!t.registration_opening_datetime || !t.registration_closing_datetime || !t.full_name || typeof t.full_name !== 'string') {
            return false;
        }
        const startDateString = t.full_name.split(',')[0];
        if (!startDateString) return false;

        const regOpen = parseISO(t.registration_opening_datetime);
        const regClose = parseISO(t.registration_closing_datetime);
        const startDate = parseISO(startDateString);

        if (!isValid(regOpen) || !isValid(regClose) || !isValid(startDate)) {
            return false;
        }

        return isBefore(regOpen, now) && isAfter(regClose, now) && isAfter(startDate, now);
    });

    const startingToday = tournaments.filter(t => {
        if (!t.full_name || typeof t.full_name !== 'string') {
            return false;
        }
        const startDateString = t.full_name.split(',')[0];
        if (!startDateString) return false;
        
        const startDate = parseISO(startDateString);
        if (!isValid(startDate)) return false;

        const eightHoursFromNow = addHours(now, 8);
        return isToday(startDate) && isAfter(startDate, now) && isBefore(startDate, eightHoursFromNow);
    });

    return { upcoming, startingToday };
};

const fetchParticipantsByTournamentId = async (tournamentId) => {
    if (!tournamentId) {
        throw new Error('Tournament ID is required to fetch participants.');
    }
    try {
        console.log(`Fetching participants for tournament ID: ${tournamentId}`);
        const response = await axios.get(`${config.apiBaseUrl}${PARTICIPANTS_ENDPOINT}`, {
            params: { tournamentId }
        });
        if (response.data && response.data.result) {
            return response.data.result;
        }
        throw new Error('Invalid API response format for participants.');
    } catch (error) {
        console.error(`Error fetching participants for tournament ${tournamentId}:`, error.message);
        throw new Error('Could not fetch participant data.');
    }
};

module.exports = {
    fetchAllTournaments,
    filterTournaments,
    fetchParticipantsByTournamentId,
};
