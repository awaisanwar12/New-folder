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

// Allowed email domains for tournament notifications
const ALLOWED_EMAIL_DOMAINS = [
    'mailinator.com',
    'mailinator'
    // Add more domains here as needed
];

// Helper function to check if email domain is allowed
const isEmailDomainAllowed = (email) => {
    if (!email || typeof email !== 'string') {
        return false;
    }
    
    const emailLower = email.toLowerCase();
    
    return ALLOWED_EMAIL_DOMAINS.some(domain => {
        // Check if email ends with the domain (with or without .com)
        if (domain.includes('.')) {
            // Full domain like 'mailinator.com'
            return emailLower.endsWith(`@${domain}`);
        } else {
            // Partial domain like 'mailinator'
            return emailLower.includes(`@${domain}`) || emailLower.endsWith(`@${domain}.com`);
        }
    });
};

// Function to add new allowed domains (can be called manually)
const addAllowedEmailDomain = (domain) => {
    if (domain && typeof domain === 'string' && !ALLOWED_EMAIL_DOMAINS.includes(domain)) {
        ALLOWED_EMAIL_DOMAINS.push(domain.toLowerCase());
        console.log(`✅ Added new allowed email domain: ${domain}`);
        return true;
    }
    return false;
};

// Function to get current allowed domains
const getAllowedEmailDomains = () => {
    return [...ALLOWED_EMAIL_DOMAINS];
};

// Authenticate and get fresh token for user API calls
const authenticateAndGetToken = async () => {
    try {
        // Check if we have a valid cached token (with 10 minute buffer for safety)
        if (cachedToken && tokenExpiry && Date.now() < (tokenExpiry - 10 * 60 * 1000)) {
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
            timeout: 30000, // 30 second timeout for auth
            validateStatus: (status) => status >= 200 && status < 300
        });

        if (!response.data || !response.data.result || !response.data.result.accessToken) {
            throw new Error('Invalid authentication response - no access token received.');
        }

        // Cache the token with shorter expiry for better reliability (30 minutes)
        cachedToken = response.data.result.accessToken;
        tokenExpiry = Date.now() + (30 * 60 * 1000); // 30 minutes from now

        console.log('✅ Authentication successful - token cached for 30 minutes');
        return cachedToken;

    } catch (error) {
        // Clear cached token on auth failure
        cachedToken = null;
        tokenExpiry = null;
        
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
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        timeout: 90000, // 90 second timeout for user requests
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400
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
    const batchSize = 50; // Reduced batch size for better reliability
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds base delay
    const maxDelay = 30000; // 30 seconds max delay
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Helper function for exponential backoff
    const getRetryDelay = (attempt) => Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    
    try {
        console.log('🚀 Fetching all users using batch API calls...');
        
        let allUsers = [];
        let skipCount = 0;
        let hasMoreUsers = true;
        let totalFetched = 0;
        let batchNumber = 1;
        let consecutiveFailures = 0;

        while (hasMoreUsers) {
            console.log(`📥 Fetching batch ${batchNumber}: Skip=${skipCount}, MaxResults=${batchSize}`);
            
            let batchSuccess = false;
            let retryAttempt = 0;
            
            while (!batchSuccess && retryAttempt < maxRetries) {
                try {
                    // Get fresh authenticated axios instance for each retry
        const authenticatedAxios = await createAuthenticatedRequestForUsers();
        
                    // Configure request with longer timeout and better error handling
        const requestUrl = `${config.userApiBaseUrl}${USERS_ENDPOINT}`;
        const requestParams = {
                        SkipCount: skipCount,
                        MaxResultCount: batchSize
        };
        
        const startTime = Date.now();
        
        const response = await authenticatedAxios.get(requestUrl, {
                        params: requestParams,
                        timeout: 90000, // 90 seconds timeout
                        validateStatus: (status) => status >= 200 && status < 300
        });

        if (!response.data || !response.data.result) {
            throw new Error('Invalid API response format from users endpoint.');
        }

        const users = response.data.result.items || response.data.result;
        
        if (!Array.isArray(users)) {
            throw new Error('Expected users array in API response.');
        }

                                        // Add all users to the collection (no domain filtering here)
                    allUsers = allUsers.concat(users);
                    totalFetched += users.length;
                    
                    const elapsed = Date.now() - startTime;
                    console.log(`✅ Batch ${batchNumber} completed: ${users.length} users fetched in ${elapsed}ms. Total: ${totalFetched}`);
                    
                    // Check if we've reached the end - if we got fewer users than requested, we're done
                    // Note: Check original users array, not filtered, to determine if more data exists
                    hasMoreUsers = users.length === batchSize;
                    skipCount += batchSize;
                    batchNumber++;
                    consecutiveFailures = 0; // Reset failure counter on success
                    batchSuccess = true;
                    
                } catch (error) {
                    retryAttempt++;
                    consecutiveFailures++;
                    
                    const isLastAttempt = retryAttempt >= maxRetries;
                    const retryDelay = getRetryDelay(retryAttempt - 1);
                    
                    console.error(`🚨 Batch ${batchNumber} attempt ${retryAttempt} failed:`, {
                        message: error.message,
                        code: error.code,
                        status: error.response?.status,
                        skipCount: skipCount,
                        isLastAttempt: isLastAttempt
                    });
                    
                    if (isLastAttempt) {
                        // If we've had too many consecutive failures, stop the process
                        if (consecutiveFailures >= 5) {
                            console.error('🚨 Too many consecutive failures, stopping batch process');
                            throw new Error(`Failed to fetch users after ${maxRetries} retries: ${error.message}`);
                        }
                        
                        // Skip this batch and continue with next
                        console.log(`⚠️ Skipping batch ${batchNumber} after ${maxRetries} failed attempts`);
                        skipCount += batchSize;
                        batchNumber++;
                        hasMoreUsers = true; // Continue with next batch
                        batchSuccess = true; // Exit retry loop
                    } else {
                        // Wait before retrying
                        console.log(`⏳ Retrying batch ${batchNumber} in ${retryDelay}ms...`);
                        await sleep(retryDelay);
                    }
                }
            }
            
            // Adaptive delay between batches based on recent performance
            if (hasMoreUsers) {
                const adaptiveDelay = consecutiveFailures > 0 ? 3000 : 1500; // Longer delay if we've had failures
                await sleep(adaptiveDelay);
            }
        }

        console.log(`🎉 Successfully fetched ${totalFetched} total users in ${batchNumber - 1} batches`);
        return allUsers;

    } catch (error) {
        console.error('🚨 User fetch process failed:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            url: error.config?.url,
            params: error.config?.params
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
    addAllowedEmailDomain,
    getAllowedEmailDomains,
    isEmailDomainAllowed
};
