# RentFlow - Landlord Management System

A comprehensive rental property management system with Google Sheets integration.

## Features

- **Property Management**: Track rental properties, occupancy status, and rent amounts
- **Tenant Management**: Manage tenant information, lease agreements, and contact details
- **Payment Portal**: Monitor rent payments, track payment history, and manage transactions
- **Repair Management**: Handle maintenance requests with priority tracking and status updates
- **Google Sheets Integration**: Secure OAuth 2.0 connection to sync data with Google Sheets

## Google Sheets Setup

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google Sheets API and Google Drive API

2. **Configure OAuth 2.0**:
   - Go to "Credentials" in the Google Cloud Console
   - Create OAuth 2.0 Client ID
   - Add your domain to authorized origins
   - Add `your-domain.com/auth/callback` to authorized redirect URIs

3. **Environment Variables**:
   - Copy `.env.example` to `.env`
   - Add your Google Client ID and Client Secret

4. **Google Sheets Structure**:
   The app will automatically create these sheets in your spreadsheet:
   - **Properties**: Property details and status
   - **Tenants**: Tenant information and lease data
   - **Payments**: Payment history and transaction records

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Google OAuth credentials
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Connect to Google Sheets:
   - Click "Connect Sheets" in the header
   - Authenticate with your Google account
   - Select or enter your spreadsheet ID
   - Start syncing your rental data

## Security

- Uses Google OAuth 2.0 for secure authentication
- Access tokens are automatically refreshed
- All data transmission is encrypted
- No API keys stored in the frontend

## Tech Stack

- React 18 with TypeScript
- Tailwind CSS for styling
- Google Sheets API v4
- Google OAuth 2.0
- Lucide React for icons
- Vite for development and building