export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string; // e.g., "Bearer"
  scope: string; // Scopes granted, space-separated
  expires_in: number; // Seconds until expiry (e.g., 3600)
  refresh_token: string; // Use this to get a new access token
}

export interface SpotifyErrorResponse {
  error: string; // e.g., "invalid_grant"
  error_description: string; // More details
}

export interface ExchangeCodeRequestBody {
  code: string;
  state: string;
}

export interface RefreshTokenRequestBody {
  refresh_token: string;
}
