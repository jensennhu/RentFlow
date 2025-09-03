import { GoogleSheetsConfig, GoogleSheet } from '../types';

class GoogleAuthService {
  private readonly CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '891997462793-hsete63gelvlbjmh4bimq1c8fl57ukhd.apps.googleusercontent.com';
  private readonly CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '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';
  private readonly REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:5173/api/auth/callback';
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/userinfo.email'
  ].join(' ');

  private config: GoogleSheetsConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    const stored = localStorage.getItem('googleSheetsConfig');
    if (stored) {
      this.config = JSON.parse(stored);
    }
  }

  private saveConfig(config: GoogleSheetsConfig) {
    this.config = config;
    localStorage.setItem('googleSheetsConfig', JSON.stringify(config));
  }

  getConfig(): GoogleSheetsConfig | null {
    return this.config;
  }

  isConnected(): boolean {
    return this.config?.connected && this.isTokenValid() || false;
  }

  private isTokenValid(): boolean {
    if (!this.config?.expiryDate) return false;
    return Date.now() < this.config.expiryDate;
  }

  initiateOAuth(): void {
    if (!this.CLIENT_ID) {
      throw new Error('Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID environment variable.');
    }

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', this.CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', this.REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', this.SCOPES);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    window.location.href = authUrl.toString();
  }

  async handleAuthCallback(code: string): Promise<GoogleSheetsConfig> {
    if (!this.CLIENT_ID) {
      throw new Error('Google Client ID not configured');
    }

    try {
      // Exchange code for tokens
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
        throw new Error('Failed to exchange authorization code for tokens');
      }

      const tokens = await tokenResponse.json();

      // Get user info
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      });

      const userInfo = await userResponse.json();

      const config: GoogleSheetsConfig = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: Date.now() + (tokens.expires_in * 1000),
        connected: true,
        userEmail: userInfo.email,
      };

      this.saveConfig(config);
      return config;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw new Error('Failed to complete Google authentication');
    }
  }

  async refreshAccessToken(): Promise<void> {
    if (!this.config?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET,
          refresh_token: this.config.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh access token');
      }

      const tokens = await response.json();

      const updatedConfig = {
        ...this.config,
        accessToken: tokens.access_token,
        expiryDate: Date.now() + (tokens.expires_in * 1000),
      };

      this.saveConfig(updatedConfig);
    } catch (error) {
      console.error('Token refresh error:', error);
      this.disconnect();
      throw error;
    }
  }

  async getValidAccessToken(): Promise<string> {
    if (!this.config?.accessToken) {
      throw new Error('No access token available');
    }

    if (!this.isTokenValid()) {
      await this.refreshAccessToken();
    }

    return this.config.accessToken!;
  }

  async listUserSheets(): Promise<GoogleSheet[]> {
    try {
      const accessToken = await this.getValidAccessToken();
      
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files?q=mimeType="application/vnd.google-apps.spreadsheet"&fields=files(id,name,webViewLink)',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user spreadsheets');
      }

      const data = await response.json();
      
      return data.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        url: file.webViewLink,
      }));
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
    }
  }

  disconnect(): void {
    localStorage.removeItem('googleSheetsConfig');
    this.config = null;
  }
}

export const googleAuthService = new GoogleAuthService();