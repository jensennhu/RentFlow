import { GoogleSheetsConfig, GoogleSheet } from '../types';

class GoogleAuthService {
  private readonly API_BASE = 'http://localhost:5173';
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

  // Initiate OAuth flow by redirecting to backend
  initiateOAuth(): void {
    window.location.href = `${this.API_BASE}/auth/google`;
  }

  // Handle OAuth callback from URL parameters
  async handleAuthCallback(): Promise<GoogleSheetsConfig> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }

    if (!code) {
      throw new Error('No authorization code received');
    }

    try {
      // The callback route will handle the token exchange
      const response = await fetch(`${this.API_BASE}/api/auth/callback?code=${code}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to authenticate');
      }

      const data = await response.json();

      const config: GoogleSheetsConfig = {
        accessToken: data.tokens.access_token,
        refreshToken: data.tokens.refresh_token,
        expiryDate: data.tokens.expiry_date,
        connected: true,
        userEmail: data.user.email,
      };

      this.saveConfig(config);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
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
      // In a real implementation, you'd call your backend to refresh the token
      // For now, we'll simulate the refresh
      console.log('Token refresh would be handled by backend');
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
      const response = await fetch(`${this.API_BASE}/api/sheets/list`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user spreadsheets');
      }

      const data = await response.json();
      return data.sheets;
    } catch (error) {
      console.error('Error listing sheets:', error);
      throw error;
    }
  }

  async testConnection(spreadsheetId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/api/sheets/${spreadsheetId}`, {
        credentials: 'include'
      });
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
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

  async logout(): Promise<void> {
    try {
      await fetch(`${this.API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.disconnect();
    }
  }

  disconnect(): void {
    localStorage.removeItem('googleSheetsConfig');
    this.config = null;
  }
}

export const googleAuthService = new GoogleAuthService();