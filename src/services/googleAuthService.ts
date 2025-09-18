import { GoogleSheetsConfig, GoogleSheet } from '../types';

class GoogleAuthService {
  private readonly CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '891997462793-hsete63gelvlbjmh4bimq1c8fl57ukhd.apps.googleusercontent.com';
  private readonly CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET ;
  private readonly REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:5173/api/auth/callback';
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/userinfo.email'
  ].join(' ');

  private config: GoogleSheetsConfig | null = null;
  private readonly STORAGE_KEY = 'googleSheetsConfig';

  constructor() {
    this.loadConfig();
    this.initializeSession();
  }

  private loadConfig() {
    try {
      // Add this check for artifacts environment
      if (typeof localStorage === 'undefined') {
        console.warn('localStorage not available, using memory-only storage');
        return;
      }
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        
        // Validate the stored config has required fields
        if (parsedConfig.accessToken && parsedConfig.refreshToken) {
          this.config = parsedConfig;
          console.log('Loaded stored Google auth configuration');
        } else {
          console.warn('Stored config missing required tokens, clearing...');
          this.clearStoredConfig();
        }
      }
    } catch (error) {
      console.error('Error loading stored config:', error);
      this.clearStoredConfig();
    }
  }

  private saveConfig(config: GoogleSheetsConfig) {
    try {
      this.config = config;
      // Add this check for artifacts environment
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
        console.log('Google auth configuration saved');
      } else {
        console.log('Google auth configuration saved to memory only');
      }
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  private clearStoredConfig() {
    try {
      // Add this check for artifacts environment
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.STORAGE_KEY);
      }
      this.config = null;
      console.log('Cleared stored Google auth configuration');
    } catch (error) {
      console.error('Error clearing stored config:', error);
    }
  }

  private async initializeSession() {
    if (this.config && this.config.connected) {
      try {
        // Check if we need to refresh the token on startup
        if (!this.isTokenValid() && this.config.refreshToken) {
          console.log('Token expired on startup, refreshing...');
          await this.refreshAccessToken();
        }
        
        // Test the connection to make sure everything is working
        if (this.config.spreadsheetId) {
          const isValid = await this.testConnection();
          if (!isValid) {
            console.warn('Stored session is invalid, user will need to re-authenticate');
          }
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        // Don't clear config here, just log the error
        // User can try to use the app and it will prompt for re-auth if needed
      }
    }
  }

  private async testConnection(): Promise<boolean> {
    try {
      if (!this.config?.accessToken) return false;
      
      // Test with a simple API call
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
        }
      );
      
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  getConfig(): GoogleSheetsConfig | null {
    return this.config;
  }

  isConnected(): boolean {
    if (!this.config?.connected) return false;
    
    // If token is expired but we have refresh token, consider as connected
    // The getValidAccessToken method will handle refresh
    if (!this.isTokenValid() && this.config.refreshToken) {
      return true;
    }
    
    return this.isTokenValid();
  }

  private isTokenValid(): boolean {
    if (!this.config?.expiryDate || !this.config?.accessToken) return false;
    
    // Add 5 minute buffer to prevent edge cases
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    return Date.now() < (this.config.expiryDate - bufferTime);
  }

  // Check if user has ever authenticated (has refresh token)
  hasStoredCredentials(): boolean {
    return !!(this.config?.refreshToken);
  }

  // Get user info from stored config
  getUserInfo(): { email?: string; connected: boolean } {
    return {
      email: this.config?.userEmail,
      connected: this.isConnected()
    };
  }

  initiateOAuth(): void {
    if (!this.CLIENT_ID) {
      throw new Error('Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID environment variable.');
    }

    // Generate state parameter for security
    const state = Math.random().toString(36).substring(2, 15);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('oauth_state', state);
    }

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', this.CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', this.REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', this.SCOPES);
    authUrl.searchParams.set('access_type', 'offline'); // Critical for getting refresh token
    authUrl.searchParams.set('prompt', 'consent'); // Force consent to ensure refresh token
    authUrl.searchParams.set('state', state);

    console.log('Initiating OAuth flow...');
    window.location.href = authUrl.toString();
  }

  async handleAuthCallback(code: string, state?: string): Promise<GoogleSheetsConfig> {
    if (!this.CLIENT_ID) {
      throw new Error('Google Client ID not configured');
    }

    // Verify state parameter if provided
    if (state && typeof sessionStorage !== 'undefined') {
      const storedState = sessionStorage.getItem('oauth_state');
      if (state !== storedState) {
        throw new Error('Invalid state parameter - possible CSRF attack');
      }
      sessionStorage.removeItem('oauth_state');
    }

    try {
      console.log('Exchanging authorization code for tokens...');
      
      // Exchange code for tokens (no client secret needed for public clients)
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.REDIRECT_URI,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        throw new Error(`Token exchange failed: ${errorData.error_description || tokenResponse.statusText}`);
      }

      const tokens = await tokenResponse.json();

      if (!tokens.refresh_token) {
        console.warn('No refresh token received - user may need to re-consent');
      }

      // Get user info
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to get user information');
      }

      const userInfo = await userResponse.json();

      const config: GoogleSheetsConfig = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || this.config?.refreshToken, // Keep old refresh token if not provided
        expiryDate: Date.now() + (tokens.expires_in * 1000),
        connected: true,
        userEmail: userInfo.email,
        spreadsheetId: this.config?.spreadsheetId, // Preserve existing spreadsheet selection
      };

      this.saveConfig(config);
      console.log(`Successfully authenticated user: ${userInfo.email}`);
      return config;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async refreshAccessToken(): Promise<void> {
    if (!this.config?.refreshToken) {
      throw new Error('No refresh token available. User needs to re-authenticate.');
    }

    try {
      console.log('Refreshing access token...');
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.CLIENT_ID,
          refresh_token: this.config.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Token refresh failed:', errorData);
        
        if (response.status === 400 && errorData.error === 'invalid_grant') {
          // Refresh token is invalid/expired - user needs to re-authenticate
          console.warn('Refresh token invalid, clearing stored auth');
          this.disconnect();
          throw new Error('Session expired. Please sign in again.');
        }
        
        throw new Error(`Token refresh failed: ${errorData.error_description || response.statusText}`);
      }

      const tokens = await response.json();

      const updatedConfig = {
        ...this.config,
        accessToken: tokens.access_token,
        expiryDate: Date.now() + (tokens.expires_in * 1000),
        // Keep existing refresh token if new one not provided
        refreshToken: tokens.refresh_token || this.config.refreshToken,
      };

      this.saveConfig(updatedConfig);
      console.log('Access token refreshed successfully');
    } catch (error) {
      console.error('Token refresh error:', error);
      
      if (error instanceof Error && error.message.includes('Session expired')) {
        // Re-throw session expired errors
        throw error;
      }
      
      // For other errors, disconnect and require re-auth
      this.disconnect();
      throw new Error('Authentication session invalid. Please sign in again.');
    }
  }

  async getValidAccessToken(): Promise<string> {
    if (!this.config?.accessToken) {
      throw new Error('No access token available. Please authenticate first.');
    }

    // Check if token needs refresh
    if (!this.isTokenValid()) {
      if (!this.config.refreshToken) {
        throw new Error('Access token expired and no refresh token available. Please re-authenticate.');
      }
      
      await this.refreshAccessToken();
    }

    return this.config.accessToken!;
  }

  async listUserSheets(): Promise<GoogleSheet[]> {
    try {
      const accessToken = await this.getValidAccessToken();
      
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files?q=mimeType="application/vnd.google-apps.spreadsheet"&fields=files(id,name,webViewLink)&orderBy=modifiedTime desc',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch spreadsheets: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      return data.files?.map((file: any) => ({
        id: file.id,
        name: file.name,
        url: file.webViewLink,
      })) || [];
    } catch (error) {
      console.error('Error listing sheets:', error);
      throw error;
    }
  }

  setSpreadsheetId(spreadsheetId: string): void {
    if (this.config) {
      const updatedConfig = {
        ...this.config,
        spreadsheetId,
      };
      this.saveConfig(updatedConfig);
      console.log(`Spreadsheet ID updated: ${spreadsheetId}`);
    }
  }

  // Soft disconnect - keep refresh token for easy re-connection
  softDisconnect(): void {
    if (this.config) {
      const updatedConfig = {
        ...this.config,
        connected: false,
        accessToken: '', // Clear access token but keep refresh token
      };
      this.saveConfig(updatedConfig);
      console.log('Soft disconnect completed - refresh token preserved');
    }
  }

  // Hard disconnect - remove all stored data
  disconnect(): void {
    this.clearStoredConfig();
    console.log('Disconnected from Google Sheets');
  }

  // Method to check if auto-reconnect is possible
  canAutoReconnect(): boolean {
    return !!(this.config?.refreshToken && !this.config?.connected);
  }

  // Method to attempt auto-reconnect
  async attemptAutoReconnect(): Promise<boolean> {
    if (!this.canAutoReconnect()) {
      return false;
    }

    try {
      await this.refreshAccessToken();
      
      if (this.config) {
        this.config.connected = true;
        this.saveConfig(this.config);
      }
      
      console.log('Auto-reconnect successful');
      return true;
    } catch (error) {
      console.error('Auto-reconnect failed:', error);
      return false;
    }
  }
}

export const googleAuthService = new GoogleAuthService();