// src/services/googleAuth.ts
export class GoogleAuthService {
  private readonly CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
  private readonly REDIRECT_URI =
    import.meta.env.VITE_GOOGLE_REDIRECT_URI ||
    "http://localhost:5173/api/auth/callback";
  private readonly SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");

  // Generates Google OAuth URL
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: this.SCOPES,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
}
