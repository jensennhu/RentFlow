// src/hooks/useGoogleAuth.ts
import { useState, useEffect, useCallback } from "react";
import { GoogleAuthService } from "../services/googleAuth";

const googleAuth = new GoogleAuthService();

interface GoogleAuthState {
  isConnected: boolean;
  isLoading: boolean;
  userEmail: string | null;
  error: string | null;
  hasStoredCredentials: boolean;
  canAutoReconnect: boolean;
  signIn: () => void;
  signOut: () => void;
  refreshConnection: () => void;
  clearError: () => void;
}

export function useGoogleAuth(): GoogleAuthState {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const [canAutoReconnect, setCanAutoReconnect] = useState(false);

  const clearError = () => setError(null);

  // Redirect to Google OAuth
  const signIn = useCallback(() => {
    const url = googleAuth.getAuthUrl();
    window.location.href = url;
  }, []);

  // Logout / clear tokens
  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsConnected(false);
      setUserEmail(null);
      setHasStoredCredentials(false);
      setCanAutoReconnect(false);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // Try refreshing connection if stored credentials exist
  const refreshConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      if (!res.ok) throw new Error("Failed to refresh credentials");

      const data = await res.json();
      setIsConnected(data.isConnected);
      setUserEmail(data.email || null);
      setHasStoredCredentials(data.hasStoredCredentials || false);
      setCanAutoReconnect(data.canAutoReconnect || false);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setIsConnected(false);
    }
  }, []);

  // On mount, check current auth status from backend
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/auth/status");
        const data = await res.json();

        setIsConnected(data.isConnected);
        setUserEmail(data.email || null);
        setHasStoredCredentials(data.hasStoredCredentials || false);
        setCanAutoReconnect(data.canAutoReconnect || false);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, []);

  return {
    isConnected,
    isLoading,
    userEmail,
    error,
    hasStoredCredentials,
    canAutoReconnect,
    signIn,
    signOut,
    refreshConnection,
    clearError,
  };
}
