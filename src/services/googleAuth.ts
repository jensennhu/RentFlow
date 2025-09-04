import { GoogleSheetsConfig, GoogleSheet } from '../types';

class GoogleAuthService {
  private readonly API_BASE = 'http://localhost:3001';
  private config: GoogleSheetsConfig | null = null;

  constructor() {
    this.loadConfig();
    this.handleAuthCallback();
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

  private handleAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth');
    const email = urlParams.get('email');
    const error = urlParams.get('error');

    if (authSuccess === 'success' && email) {
      const config: GoogleSheetsConfig = {
        connected: true,
        userEmail: decodeURIComponent(email),
      };
      this.saveConfig(config);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      console.error('OAuth error:', error);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  getConfig(): GoogleSheetsConfig | null {
    return this.config;
  }

  isConnected(): boolean {
    return this.config?.connected || false;
  }

  // Initiate OAuth flow by redirecting to backend
  initiateOAuth(): void {
    window.location.href = `${this.API_BASE}/auth/google`;
  }

  async checkAuthStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/api/user`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        if (userData.authenticated) {
          const config: GoogleSheetsConfig = {
            connected: true,
            userEmail: userData.email,
          };
          this.saveConfig(config);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking auth status:', error);
      return false;
    }
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