// src/components/SupabaseSetup.tsx
import React, { useState, useEffect } from 'react';
import { X, ExternalLink, CheckCircle, AlertCircle, Database, Copy, Eye, EyeOff } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';

interface SupabaseSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSetup: () => void;
}

export const SupabaseSetup: React.FC<SupabaseSetupProps> = ({ isOpen, onClose }) => {
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  
  const isSupabaseEnabled = import.meta.env.VITE_USE_SUPABASE === 'true';
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    if (isOpen && isSupabaseEnabled) {
      testConnection();
    }
  }, [isOpen, isSupabaseEnabled]);

  const testConnection = async () => {
    setIsLoading(true);
    try {
      const isConnected = await supabaseService.testConnection();
      setConnectionStatus(isConnected ? 'connected' : 'error');
    } catch (_error) {
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Supabase Configuration</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Connection Status */}
          {isSupabaseEnabled && (
            <div className="mb-6">
              <div className={`p-4 rounded-lg ${
                connectionStatus === 'connected' 
                  ? 'bg-green-50 border border-green-200' 
                  : connectionStatus === 'error'
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className="flex items-center space-x-3">
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                      <span className="text-gray-700">Testing connection...</span>
                    </>
                  ) : connectionStatus === 'connected' ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-green-800 font-medium">Connected to Supabase</span>
                    </>
                  ) : connectionStatus === 'error' ? (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <span className="text-red-800 font-medium">Connection failed</span>
                    </>
                  ) : (
                    <>
                      <Database className="h-5 w-5 text-gray-600" />
                      <span className="text-gray-700">Connection status unknown</span>
                    </>
                  )}
                  <button
                    onClick={testConnection}
                    disabled={isLoading}
                    className="ml-auto text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    Test Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isSupabaseEnabled && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Supabase Not Enabled</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Set <code className="bg-yellow-100 px-1 rounded">VITE_USE_SUPABASE=true</code> in your environment variables to enable Supabase integration.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Setup Steps */}
          <div className="space-y-6">
            {/* Step 1: Create Supabase Project */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Create Supabase Project</h4>
              <div className="space-y-3">
                <p className="text-gray-600">
                  Create a new Supabase project to get started with your database backend.
                </p>
                <div className="flex items-center space-x-4">
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Create Supabase Project
                  </a>
                  <span className="text-sm text-gray-500">
                    Sign up and create a new project
                  </span>
                </div>
              </div>
            </div>

            {/* Step 2: Environment Variables */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Environment Variables</h4>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Create a <code className="bg-gray-100 px-2 py-1 rounded">.env</code> file in your project root with the following variables:
                </p>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Environment Variables</span>
                    <button
                      onClick={() => setShowCredentials(!showCredentials)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                    >
                      {showCredentials ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                      {showCredentials ? 'Hide' : 'Show'} Current Values
                    </button>
                  </div>
                  
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
{`# Enable Supabase
VITE_USE_SUPABASE=true

# Supabase Configuration
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key`}
                  </pre>

                  {showCredentials && (
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <div className="text-sm text-gray-600 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Current VITE_USE_SUPABASE:</span>
                          <span className={`px-2 py-1 rounded text-xs ${isSupabaseEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {isSupabaseEnabled ? 'true' : 'false'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Current VITE_SUPABASE_URL:</span>
                          <div className="flex items-center">
                            <span className="text-xs font-mono mr-2">
                              {supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'Not set'}
                            </span>
                            {supabaseUrl && (
                              <button
                                onClick={() => copyToClipboard(supabaseUrl)}
                                className="text-blue-600 hover:text-blue-700"
                                title="Copy URL"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Current VITE_SUPABASE_ANON_KEY:</span>
                          <div className="flex items-center">
                            <span className="text-xs font-mono mr-2">
                              {supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'Not set'}
                            </span>
                            {supabaseAnonKey && (
                              <button
                                onClick={() => copyToClipboard(supabaseAnonKey)}
                                className="text-blue-600 hover:text-blue-700"
                                title="Copy Key"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-sm text-gray-600">
                  <p className="mb-2">You can find these values in your Supabase dashboard:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Go to Settings → API</li>
                    <li>Copy the "Project URL" and "Project API keys" (anon/public key)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 3: Database Setup */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Step 3: Database Setup</h4>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Run the provided SQL schema in your Supabase SQL editor to create the necessary tables.
                </p>
                
                <div className="flex items-center space-x-4">
                  <a
                    href="https://supabase.com/dashboard/project/_/sql"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Open SQL Editor
                  </a>
                  <span className="text-sm text-gray-500">
                    Copy and paste the schema from the documentation
                  </span>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> The database schema creates tables for properties, tenants, payments, and repair requests with proper relationships and security policies.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4: Install Dependencies */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Step 4: Install Dependencies</h4>
              <div className="space-y-3">
                <p className="text-gray-600">
                  Install the Supabase JavaScript client:
                </p>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <pre className="text-sm text-gray-800">npm install @supabase/supabase-js</pre>
                    <button
                      onClick={() => copyToClipboard('npm install @supabase/supabase-js')}
                      className="text-blue-600 hover:text-blue-700"
                      title="Copy command"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Documentation Links */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4">Helpful Resources</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="https://supabase.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Supabase Documentation</p>
                  <p className="text-sm text-gray-600">Complete guide to Supabase</p>
                </div>
              </a>
              
              <a
                href="https://supabase.com/docs/guides/getting-started/quickstarts/reactjs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">React Quickstart</p>
                  <p className="text-sm text-gray-600">Supabase with React guide</p>
                </div>
              </a>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
            {isSupabaseEnabled && (
              <button
                onClick={testConnection}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Test Connection
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};