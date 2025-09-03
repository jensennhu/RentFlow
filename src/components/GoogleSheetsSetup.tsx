import React, { useState, useEffect } from 'react';
import { X, ExternalLink, CheckCircle, AlertCircle, RefreshCw, FileSpreadsheet, User, LogOut } from 'lucide-react';
import { googleAuthService } from '../services/googleAuth';
import { googleSheetsService } from '../services/googleSheets';
import { GoogleSheetsConfig, GoogleSheet } from '../types';

interface GoogleSheetsSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (config: GoogleSheetsConfig) => void;
}

export const GoogleSheetsSetup: React.FC<GoogleSheetsSetupProps> = ({ isOpen, onClose, onConnect }) => {
  const [step, setStep] = useState<'auth' | 'spreadsheet' | 'connected'>('auth');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [userSheets, setUserSheets] = useState<GoogleSheet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<GoogleSheetsConfig | null>(null);

  useEffect(() => {
    if (isOpen) {
      const currentConfig = googleAuthService.getConfig();
      setConfig(currentConfig);
      
      if (currentConfig?.connected) {
        if (currentConfig.spreadsheetId) {
          setStep('connected');
          setSpreadsheetId(currentConfig.spreadsheetId);
        } else {
          setStep('spreadsheet');
          loadUserSheets();
        }
      } else {
        setStep('auth');
      }

      // Handle OAuth callback
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      if (code) {
        handleOAuthCallback(code);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [isOpen]);

  const handleOAuthCallback = async (code: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      const newConfig = await googleAuthService.handleAuthCallback(code);
      setConfig(newConfig);
      setStep('spreadsheet');
      await loadUserSheets();
    } catch (err) {
      setError('Failed to authenticate with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserSheets = async () => {
    setIsLoading(true);
    try {
      const sheets = await googleAuthService.listUserSheets();
      setUserSheets(sheets);
    } catch (err) {
      setError('Failed to load your Google Sheets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    try {
      googleAuthService.initiateOAuth();
    } catch (err) {
      setError('Failed to initiate Google login. Please check your configuration.');
    }
  };

  const handleSpreadsheetSelect = async (selectedId: string) => {
    setIsLoading(true);
    setError('');

    try {
      // Test connection to the spreadsheet
      const isValid = await googleSheetsService.testConnection(selectedId);
      
      if (isValid) {
        // Create required sheets if they don't exist
        await googleSheetsService.createSheetsIfNeeded(selectedId);
        
        googleAuthService.setSpreadsheetId(selectedId);
        const updatedConfig = googleAuthService.getConfig()!;
        
        onConnect(updatedConfig);
        setStep('connected');
        setSpreadsheetId(selectedId);
      } else {
        setError('Unable to access the selected spreadsheet. Please check permissions.');
      }
    } catch (err) {
      setError('Failed to connect to the spreadsheet.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSpreadsheetId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spreadsheetId.trim()) return;
    
    await handleSpreadsheetSelect(spreadsheetId.trim());
  };

  const handleDisconnect = () => {
    googleAuthService.disconnect();
    setConfig(null);
    setStep('auth');
    setSpreadsheetId('');
    setUserSheets([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Google Sheets Integration</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Authentication Step */}
          {step === 'auth' && (
            <div className="text-center">
              <div className="mb-6">
                <FileSpreadsheet className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Connect Your Google Account</h4>
                <p className="text-gray-600">
                  Securely connect your Google account to sync rental data with Google Sheets
                </p>
              </div>

              <div className="mb-6 p-4 bg-blue-50 rounded-lg text-left">
                <h5 className="font-medium text-blue-900 mb-2">What you'll get:</h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Automatic backup of all rental data</li>
                  <li>• Real-time synchronization with Google Sheets</li>
                  <li>• Easy data export and reporting</li>
                  <li>• Secure OAuth 2.0 authentication</li>
                </ul>
              </div>

              {error && (
                <div className="mb-4 flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                  </>
                )}
              </button>
            </div>
          )}

          {/* Spreadsheet Selection Step */}
          {step === 'spreadsheet' && (
            <div>
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Connected to Google</h4>
                    <p className="text-sm text-gray-600">{config?.userEmail}</p>
                  </div>
                </div>
                <p className="text-gray-600">
                  Now select or enter the Google Spreadsheet you want to use for your rental data.
                </p>
              </div>

              {/* Manual Spreadsheet ID Input */}
              <form onSubmit={handleManualSpreadsheetId} className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Spreadsheet ID
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !spreadsheetId.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'Connect'
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Found in your Google Sheets URL: docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit
                </p>
              </form>

              {/* Or Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or choose from your sheets</span>
                </div>
              </div>

              {/* User's Spreadsheets */}
              {isLoading && userSheets.length === 0 ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
                  <p className="text-gray-600">Loading your spreadsheets...</p>
                </div>
              ) : userSheets.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {userSheets.map((sheet) => (
                    <button
                      key={sheet.id}
                      onClick={() => handleSpreadsheetSelect(sheet.id)}
                      disabled={isLoading}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">{sheet.name}</p>
                          <p className="text-xs text-gray-500 truncate">{sheet.id}</p>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileSpreadsheet className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No spreadsheets found in your Google Drive</p>
                  <p className="text-sm text-gray-500">Create a new Google Sheet or use the manual ID input above</p>
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    googleAuthService.disconnect();
                    setStep('auth');
                  }}
                  className="text-gray-600 hover:text-gray-800 text-sm flex items-center"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Use different Google account
                </button>
              </div>
            </div>
          )}

          {/* Connected Step */}
          {step === 'connected' && (
            <div className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Successfully Connected!</h4>
                <p className="text-gray-600">
                  Your rental data will now sync with Google Sheets
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Connected Account:</span>
                  <span className="font-medium text-gray-900">{config?.userEmail}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Spreadsheet ID:</span>
                  <span className="font-mono text-xs text-gray-700 truncate max-w-xs">{spreadsheetId}</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
                <button
                  onClick={handleDisconnect}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}

          {/* Help Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-start space-x-3">
              <ExternalLink className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Need help?</h4>
                <p className="text-sm text-gray-600">
                  Check out the{' '}
                  <a
                    href="https://developers.google.com/sheets/api/quickstart"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    Google Sheets API documentation
                  </a>{' '}
                  for detailed setup instructions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};