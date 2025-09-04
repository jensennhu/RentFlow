import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Google OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/api/auth/callback'
);

// In-memory token storage (replace with database in production)
let userTokens = {};

// OAuth scopes
const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets'
];

// Route: GET /auth/google - Redirect to Google OAuth consent screen
app.get('/auth/google', (req, res) => {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force consent screen to get refresh token
      include_granted_scopes: true
    });

    console.log('Redirecting to Google OAuth:', authUrl);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authentication URL' });
  }
});

// Route: GET /api/auth/callback - Handle OAuth callback
app.get('/api/auth/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error('OAuth error:', error);
    return res.status(400).json({ error: 'OAuth authentication failed' });
  }

  if (!code) {
    return res.status(400).json({ error: 'Authorization code not provided' });
  }

  try {
    console.log('Exchanging code for tokens...');
    
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getAccessToken(code);
    
    console.log('Tokens received:', {
      access_token: tokens.access_token ? 'present' : 'missing',
      refresh_token: tokens.refresh_token ? 'present' : 'missing',
      id_token: tokens.id_token ? 'present' : 'missing',
      expiry_date: tokens.expiry_date
    });

    // Set credentials for this client
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const userId = userInfo.data.id;
    const userEmail = userInfo.data.email;

    // Store tokens securely (in production, save to database)
    userTokens[userId] = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      id_token: tokens.id_token,
      expiry_date: tokens.expiry_date,
      email: userEmail
    };

    console.log(`Tokens stored for user: ${userEmail}`);
    console.log(`Refresh token: ${tokens.refresh_token ? 'STORED SECURELY' : 'NOT RECEIVED'}`);

    // Set user ID in cookie for session management
    res.cookie('userId', userId, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Return token response
    res.json({
      success: true,
      user: {
        id: userId,
        email: userEmail
      },
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        id_token: tokens.id_token,
        expiry_date: tokens.expiry_date
      }
    });

  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.status(500).json({ 
      error: 'Failed to exchange authorization code for tokens',
      details: error.message 
    });
  }
});

// Route: GET /api/user - Get current user info
app.get('/api/user', (req, res) => {
  const userId = req.cookies.userId;
  
  if (!userId || !userTokens[userId]) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = userTokens[userId];
  res.json({
    id: userId,
    email: user.email,
    authenticated: true
  });
});

// Route: GET /api/sheets/list - List user's Google Sheets
app.get('/api/sheets/list', async (req, res) => {
  const userId = req.cookies.userId;
  
  if (!userId || !userTokens[userId]) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const tokens = userTokens[userId];
    
    // Check if token is expired and refresh if needed
    if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
      await refreshUserToken(userId);
    }

    oauth2Client.setCredentials(userTokens[userId]);
    
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      fields: 'files(id,name,webViewLink)',
      pageSize: 50
    });

    const sheets = response.data.files.map(file => ({
      id: file.id,
      name: file.name,
      url: file.webViewLink
    }));

    res.json({ sheets });

  } catch (error) {
    console.error('Error listing Google Sheets:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Google Sheets',
      details: error.message 
    });
  }
});

// Route: GET /api/sheets/:spreadsheetId - Fetch data from a specific Google Sheet
app.get('/api/sheets/:spreadsheetId', async (req, res) => {
  const userId = req.cookies.userId;
  const { spreadsheetId } = req.params;
  const { range = 'Sheet1!A1:Z1000' } = req.query;
  
  if (!userId || !userTokens[userId]) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const tokens = userTokens[userId];
    
    // Check if token is expired and refresh if needed
    if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
      await refreshUserToken(userId);
    }

    oauth2Client.setCredentials(userTokens[userId]);
    
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    
    // Get spreadsheet metadata
    const spreadsheetResponse = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });

    // Get values from the specified range
    const valuesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: range
    });

    res.json({
      spreadsheet: {
        id: spreadsheetResponse.data.spreadsheetId,
        title: spreadsheetResponse.data.properties.title,
        sheets: spreadsheetResponse.data.sheets.map(sheet => ({
          id: sheet.properties.sheetId,
          title: sheet.properties.title
        }))
      },
      data: {
        range: valuesResponse.data.range,
        values: valuesResponse.data.values || []
      }
    });

  } catch (error) {
    console.error('Error fetching sheet data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sheet data',
      details: error.message 
    });
  }
});

// Route: POST /api/sheets/:spreadsheetId/sync - Sync rental data to Google Sheets
app.post('/api/sheets/:spreadsheetId/sync', async (req, res) => {
  const userId = req.cookies.userId;
  const { spreadsheetId } = req.params;
  const { properties, tenants, payments } = req.body;
  
  if (!userId || !userTokens[userId]) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const tokens = userTokens[userId];
    
    // Check if token is expired and refresh if needed
    if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
      await refreshUserToken(userId);
    }

    oauth2Client.setCredentials(userTokens[userId]);
    
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // Create sheets if they don't exist
    await createSheetsIfNeeded(sheets, spreadsheetId);

    // Sync Properties
    if (properties && properties.length > 0) {
      const propertyHeaders = ['ID', 'Address', 'Type', 'Rent', 'Status'];
      const propertyRows = properties.map(p => [p.id, p.address, p.type, p.rent.toString(), p.status]);
      const propertyValues = [propertyHeaders, ...propertyRows];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Properties!A1:E${propertyValues.length}`,
        valueInputOption: 'RAW',
        requestBody: { values: propertyValues }
      });
    }

    // Sync Tenants
    if (tenants && tenants.length > 0) {
      const tenantHeaders = ['ID', 'Name', 'Email', 'Phone', 'Property ID', 'Lease Start', 'Lease End', 'Rent Amount'];
      const tenantRows = tenants.map(t => [
        t.id, t.name, t.email, t.phone, t.propertyId, 
        t.leaseStart, t.leaseEnd, t.rentAmount.toString()
      ]);
      const tenantValues = [tenantHeaders, ...tenantRows];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Tenants!A1:H${tenantValues.length}`,
        valueInputOption: 'RAW',
        requestBody: { values: tenantValues }
      });
    }

    // Sync Payments
    if (payments && payments.length > 0) {
      const paymentHeaders = ['ID', 'Tenant ID', 'Amount', 'Date', 'Status', 'Method', 'Description'];
      const paymentRows = payments.map(p => [
        p.id, p.tenantId, p.amount.toString(), p.date, p.status, p.method, p.description
      ]);
      const paymentValues = [paymentHeaders, ...paymentRows];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Payments!A1:G${paymentValues.length}`,
        valueInputOption: 'RAW',
        requestBody: { values: paymentValues }
      });
    }

    res.json({ 
      success: true, 
      message: 'Data successfully synced to Google Sheets',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error syncing to Google Sheets:', error);
    res.status(500).json({ 
      error: 'Failed to sync data to Google Sheets',
      details: error.message 
    });
  }
});

// Route: POST /api/auth/logout - Logout user
app.post('/api/auth/logout', (req, res) => {
  const userId = req.cookies.userId;
  
  if (userId && userTokens[userId]) {
    delete userTokens[userId];
    console.log(`User ${userId} logged out`);
  }
  
  res.clearCookie('userId');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Helper function to refresh user token
async function refreshUserToken(userId) {
  try {
    const tokens = userTokens[userId];
    if (!tokens.refresh_token) {
      throw new Error('No refresh token available');
    }

    oauth2Client.setCredentials({
      refresh_token: tokens.refresh_token
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update stored tokens
    userTokens[userId] = {
      ...tokens,
      access_token: credentials.access_token,
      expiry_date: credentials.expiry_date
    };

    console.log(`Tokens refreshed for user: ${tokens.email}`);
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

// Helper function to create required sheets if they don't exist
async function createSheetsIfNeeded(sheets, spreadsheetId) {
  try {
    // Get existing sheets
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });

    const existingSheets = spreadsheet.data.sheets.map(sheet => sheet.properties.title);
    const requiredSheets = ['Properties', 'Tenants', 'Payments'];
    const sheetsToCreate = requiredSheets.filter(sheet => !existingSheets.includes(sheet));

    if (sheetsToCreate.length > 0) {
      const requests = sheetsToCreate.map(title => ({
        addSheet: {
          properties: { title }
        }
      }));

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });

      console.log(`Created sheets: ${sheetsToCreate.join(', ')}`);
    }
  } catch (error) {
    console.error('Error creating sheets:', error);
    throw error;
  }
}

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Google Sheets OAuth configured`);
  console.log(`🔐 Client ID: ${process.env.GOOGLE_CLIENT_ID ? 'configured' : 'missing'}`);
  console.log(`🔑 Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? 'configured' : 'missing'}`);
});