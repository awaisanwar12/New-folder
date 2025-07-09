const axios = require('axios');
const { parseISO, isBefore, isAfter, isToday, addHours, isValid, subHours, isSameDay } = require('date-fns');
const { utcToZonedTime } = require('date-fns-tz');
const config = require('../config/environment');

const TOURNAMENTS_ENDPOINT = '/api/services/app/Tournament/GetAllTournamentsFromDB';
const PARTICIPANTS_ENDPOINT = '/api/services/app/Participants/GetParticipantsByTournamentIdFromDB';
const REGISTRATIONS_ENDPOINT = '/api/services/app/TournamentRegistration/GetAllFromDB';
const USERS_ENDPOINT = '/api/services/app/User/GetAll';
const AUTH_ENDPOINT = '/api/TokenAuth/Authenticate';

// Token cache to avoid repeated authentication
let cachedToken = null;
let tokenExpiry = null;

// Authenticate and get fresh token for user API calls
const authenticateAndGetToken = async () => {
    try {
        // Check if we have a valid cached token (with 5 minute buffer)
        if (cachedToken && tokenExpiry && Date.now() < (tokenExpiry - 5 * 60 * 1000)) {
            return cachedToken;
        }

        console.log('🔐 Authenticating to get fresh token...');
        
        const response = await axios.post(`${config.userApiBaseUrl}${AUTH_ENDPOINT}`, {
            userNameOrEmailAddress: 'AR002@mailinator.com',
            password: 'Test@12345'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*'
            },
            timeout: 15000 // 15 second timeout for auth
        });

        if (!response.data || !response.data.result || !response.data.result.accessToken) {
            throw new Error('Invalid authentication response - no access token received.');
        }

        // Cache the token (assuming 1 hour validity, we'll refresh before that)
        cachedToken = response.data.result.accessToken;
        tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour from now

        console.log('✅ Authentication successful - token cached');
        return cachedToken;

    } catch (error) {
        // Clear cached token on auth failure
        cachedToken = null;
        tokenExpiry = null;
        
        console.error('🚨 Authentication failed:', error.message);
        if (error.response) {
            console.error('Auth Error Details:', {
                status: error.response.status,
                statusText: error.response.statusText
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
        },
        timeout: 60000 // 60 second timeout for user requests
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
        
        // Check if tournament starts "today" in the tournament's timezone
        const tournamentTimezone = t.timezone || 'UTC';
        let isTodayInTournamentTZ = false;
        
        try {
            // Convert current time and start time to tournament's timezone
            const nowInTournamentTZ = utcToZonedTime(now, tournamentTimezone);
            const startDateInTournamentTZ = utcToZonedTime(startDate, tournamentTimezone);
            
            // Check if they are on the same calendar day in tournament's timezone
            isTodayInTournamentTZ = isSameDay(nowInTournamentTZ, startDateInTournamentTZ);
        } catch (error) {
            // Fallback to UTC timezone if tournament timezone is invalid
            console.warn(`Invalid timezone '${tournamentTimezone}' for tournament ${t.name}, using UTC`);
            isTodayInTournamentTZ = isToday(startDate);
        }
        
        return isTodayInTournamentTZ && isAfter(startDate, now) && isBefore(startDate, eightHoursFromNow);
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
    const batchSize = 100; // Batch size for pagination - increased to 100
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    try {
        console.log('🚀 Fetching all users with mailinator keyword...');
        
        const authenticatedAxios = await createAuthenticatedRequestForUsers();
        
        const requestUrl = `${config.userApiBaseUrl}${USERS_ENDPOINT}`;
        const requestParams = {
            keyword: 'mailinator'
            // SkipCount: skipCount, // Commented out - no pagination
            // MaxResultCount: batchSize // Commented out - no batching
        };
        
        console.log(`📥 Fetching all users with keyword: mailinator`);
        const startTime = Date.now();
        
        // Single request logic - using keyword only
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

        const elapsed = Date.now() - startTime;
        console.log(`✅ Fetched ${users.length} users in ${elapsed}ms`);

        console.log(`🎉 Successfully fetched ${users.length} total users`);
        return users;

        // Commented out pagination logic
        // let allUsers = [];
        // let skipCount = 0;
        // let hasMoreUsers = true;
        // let totalFetched = 0;

        // while (hasMoreUsers) {
        //     console.log(`📥 Fetching batch: Skip=${skipCount}, Size=${batchSize}`);
        //     
        //     const requestUrl = `${config.userApiBaseUrl}${USERS_ENDPOINT}`;
        //     const requestParams = {
        //         keyword: 'mailinator',
        //         SkipCount: skipCount,
        //         MaxResultCount: batchSize
        //     };
        //     
        //     const startTime = Date.now();
        //     
        //     const response = await authenticatedAxios.get(requestUrl, {
        //         params: requestParams
        //     });

        //     if (!response.data || !response.data.result) {
        //         throw new Error('Invalid API response format from users endpoint.');
        //     }

        //     const users = response.data.result.items || response.data.result;
        //     
        //     if (!Array.isArray(users)) {
        //         throw new Error('Expected users array in API response.');
        //     }

        //     allUsers = allUsers.concat(users);
        //     totalFetched += users.length;
        //     
        //     const elapsed = Date.now() - startTime;
        //     console.log(`✅ Fetched ${users.length} users in ${elapsed}ms. Total: ${totalFetched}`);
        //     
        //     // Check if we've reached the end
        //     hasMoreUsers = users.length === batchSize;
        //     skipCount += batchSize;
        //     
        //     // Brief pause between batches to reduce server load
        //     if (hasMoreUsers) {
        //         await sleep(1000); // 1 second pause
        //     }
        // }

        // console.log(`🎉 Successfully fetched ${totalFetched} total users`);
        // return allUsers;

    } catch (error) {
        console.error('🚨 User fetch failed:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            url: error.config?.url
        });
        throw new Error(`Failed to fetch users: ${error.message}`);
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
