const axios = require('axios');
const { parseISO, isBefore, isAfter, isToday, addHours, isValid, subHours } = require('date-fns');
const config = require('../config/environment');

const TOURNAMENTS_ENDPOINT = '/api/services/app/Tournament/GetAllTournamentsFromDB';
const PARTICIPANTS_ENDPOINT = '/api/services/app/Participants/GetParticipantsByTournamentIdFromDB';
const REGISTRATIONS_ENDPOINT = '/api/services/app/TournamentRegistration/GetAllFromDB';
const USERS_ENDPOINT = '/api/services/app/User/GetAll';
const AUTH_ENDPOINT = '/api/TokenAuth/Authenticate';

// Authenticate and get fresh token for user API calls
const authenticateAndGetToken = async () => {
    try {
        console.log('🔐 Authenticating to get fresh token...');
        const response = await axios.post(`${config.userApiBaseUrl}${AUTH_ENDPOINT}`, {
            userNameOrEmailAddress: 'AR002@mailinator.com',
            password: 'Test@12345'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*'
            }
        });

        if (!response.data || !response.data.result || !response.data.result.accessToken) {
            throw new Error('Invalid authentication response - no access token received.');
        }

        console.log('✅ Authentication successful - received fresh token');
        return response.data.result.accessToken;

    } catch (error) {
        console.error('🚨 Authentication failed:', error.message);
        if (error.response) {
            console.error('Auth Error Details:', {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            });
        }
        throw new Error('Could not authenticate to get access token.');
    }
};

// Create authenticated axios instance with fresh token
const createAuthenticatedRequestForUsers = async () => {
    const token = await authenticateAndGetToken();
    return axios.create({
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
};

const fetchAllTournaments = async () => {
    try {
        const response = await axios.get(`${config.apiBaseUrl}${TOURNAMENTS_ENDPOINT}`);
        if (!response.data || !response.data.result) {
            throw new Error('Invalid API response format from external source.');
        }
        return response.data.result;
    } catch (error) {
        throw new Error('Could not fetch tournament data from the external source.');
    }
};

const filterTournaments = (tournaments) => {
    const now = new Date();

    const upcoming = tournaments.filter(t => {
        if (!t.registration_opening_datetime || !t.registration_closing_datetime || !t.full_name || typeof t.full_name !== 'string') {
            return false;
        }
        const startDateString = t.full_name.split(',')[0];
        if (!startDateString || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(startDateString)) {
            return false; // Silently skip if no valid date format
        }

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
        if (!startDateString || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(startDateString)) {
            return false; // Silently skip if no valid date format
        }
        
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
        const response = await axios.get(`${config.apiBaseUrl}${PARTICIPANTS_ENDPOINT}`, {
            params: { tournamentId }
        });
        if (response.data && response.data.result) {
            return response.data.result;
        }
        throw new Error('Invalid API response format for participants.');
    } catch (error) {
        throw new Error('Could not fetch participant data.');
    }
};

const fetchAllRegistrations = async () => {
    try {
        const response = await axios.get(`${config.apiBaseUrl}${REGISTRATIONS_ENDPOINT}`);
        if (response.data && response.data.result && Array.isArray(response.data.result.items)) {
            return response.data.result.items;
        }
        throw new Error('Invalid API response format for registrations.');
    } catch (error) {
        throw new Error('Could not fetch registration data.');
    }
};

const filterRecentTournaments = (tournaments) => {
    const now = new Date();
    const twentyFourHoursAgo = subHours(now, 24);

    return tournaments.filter(t => {
        if (!t.full_name || typeof t.full_name !== 'string') {
            return false;
        }
        const startDateString = t.full_name.split(',')[0];
        if (!startDateString || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(startDateString)) {
            return false; // Silently skip if no valid date format
        }

        const startDate = parseISO(startDateString);
        if (!isValid(startDate)) {
            return false;
        }

        return isAfter(startDate, twentyFourHoursAgo) && isBefore(startDate, now);
    });
};

const fetchAllUsers = async () => {
    try {
        console.log('Fetching all users with mailinator keyword from external API...');
        
        const authenticatedAxios = await createAuthenticatedRequestForUsers();
        let allUsers = [];
        let skipCount = 0;
        const maxResultCount = 20;
        let hasMoreUsers = true;

        while (hasMoreUsers) {
            console.log(`🔍 Fetching users batch: SkipCount=${skipCount}, MaxResultCount=${maxResultCount}`);
            
            const requestUrl = `${config.userApiBaseUrl}${USERS_ENDPOINT}`;
            const requestParams = {
                keyword: 'mailinator',
                SkipCount: skipCount,
                MaxResultCount: maxResultCount
            };
            
            console.log('🔍 DEBUG - Request URL:', requestUrl);
            console.log('🔍 DEBUG - Request Params:', requestParams);
            
            const response = await authenticatedAxios.get(requestUrl, {
                params: requestParams
            });

            if (!response.data || !response.data.result) {
                throw new Error('Invalid API response format from users endpoint.');
            }

            const users = response.data.result.items || response.data.result;
            if (!Array.isArray(users)) {
                throw new Error('Expected users array in API response.');
            }

            allUsers = allUsers.concat(users);
            
            // If we got fewer users than maxResultCount, we've reached the end
            hasMoreUsers = users.length === maxResultCount;
            skipCount += maxResultCount;
            
            console.log(`📊 Fetched ${users.length} users in this batch. Total so far: ${allUsers.length}`);
        }

        console.log(`✅ Successfully fetched ${allUsers.length} total users with mailinator keyword.`);
        return allUsers;

    } catch (error) {
        console.error('🚨 ERROR Details:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            responseData: error.response?.data,
            requestUrl: error.config?.url,
            requestHeaders: error.config?.headers
        });
        console.error('Error fetching users from external API:', error.message);
        throw new Error('Could not fetch user data from the external source.');
    }
};

module.exports = {
    fetchAllTournaments,
    filterTournaments,
    fetchParticipantsByTournamentId,
    fetchAllRegistrations,
    filterRecentTournaments,
    fetchAllUsers,
};
