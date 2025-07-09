require('dotenv').config();

const config = {
    port: process.env.PORT || 3000,
    apiBaseUrl: process.env.API_BASE_URL || 'https://endpoint.thegamecompany.ai',
    api: {
        bearerToken: process.env.API_BEARER_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjMzMTg0IiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6IkFSMTAwQG1haWxpbmF0b3IuY29tIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvZW1haWxhZGRyZXNzIjoiQVIxMDBAbWFpbGluYXRvci5jb20iLCJBc3BOZXQuSWRlbnRpdHkuU2VjdXJpdHlTdGFtcCI6IkhXNEtVV0dRSU5GUTVERElBV0g1Qlk3MlVSVUFXTU40IiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjoiVXNlciIsInN1YiI6IjMzMTg0IiwianRpIjoiZmMzNmU0Y2EtNDllMC00YzBlLThlNGMtMDY1ODZjZGVlZWQ4IiwiaWF0IjoxNzUyMDcxOTMxLCJFQyI6IlRydWUiLCJzZWNyZXQiOiJBRDkyRUMzM0VDODc0NzREOTMwNzM4ODk1MTNBMzE1NyIsIm5iZiI6MTc1MjA3MTkzMSwiZXhwIjoxNzUyMTU4MzMxLCJpc3MiOiJDTVMiLCJhdWQiOiJDTVMifQ.z2vpEYpfVBvwFhy68UghQR0Q6Cm-oTpurX51YHA7Lu0',
    },
    email: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        from: process.env.EMAIL_FROM,
    },
    aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
        sesEmail: process.env.AWS_SES_EMAIL_FROM || 'noreply@tgcesports.gg',
    },
};

module.exports = config;
