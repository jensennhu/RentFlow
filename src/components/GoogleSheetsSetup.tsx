import React, { useState } from 'react';
import { X, ExternalLink, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { googleSheetsService } from '../services/googleSheets';
import { GoogleSheetsConfig } from '../types';

interface GoogleSheetsSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (config: GoogleSheetsConfig) => void;
}

export const GoogleSheetsSetup: React.FC<GoogleSheetsSetupProps> = ({ isOpen, onClose, onConnect }) => {
  const [apiKey, setApiKey] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setError('');

    try {
      const isValid = await googleSheetsService.testConnection(apiKey, spreadsheetId);
      
      if (isValid) {
        const config: GoogleSheetsConfig = {
          apiKey,
          spreadsheetId,
          connected: true
        };
        
        googleSheetsService.setConfig(config);
        onConnect(config);
        onClose();
      } else {
        setError('Failed to connect. Please check your API key and Spreadsheet ID.');
      }
    } catch (err) {
      setError('Connection failed. Please verify your credentials.');
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Connect Google Sheets</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Setup Instructions:</h4>
            <ol className="text-sm text-blue-800 space-y-2">
              <li>1. Go to the <a href="https://console.developers.google.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">Google Cloud Console</a></li>
              <li>2. Create a new project or select an existing one</li>
              <li>3. Enable the Google Sheets API</li>
              <li>4. Create credentials (API Key) for the Google Sheets API</li>
              <li>5. Create a new Google Spreadsheet and copy its ID from the URL</li>
              <li>6. Make sure your spreadsheet has sheets named: "Properties", "Tenants", "Payments"</li>
            </ol>
          </div>

          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Sheets API Key
              </label>
              <input
                type="text"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="AIzaSyC..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Your Google Sheets API key from Google Cloud Console
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Spreadsheet ID
              </label>
              <input
                type="text"
                required
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              />
              <p className="text-xs text-gray-500 mt-1">
                Found in your Google Sheets URL: docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit
              </p>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={isConnecting}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Connect
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>

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