import axios, { AxiosError } from "axios";
import querystring from "querystring";
import dotenv from "dotenv";
import {
  SpotifyErrorResponse,
  SpotifyTokenResponse,
} from "../models/spotify.model";

dotenv.config();

const SPOTIFY_CLIENT_ID: string | undefined = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET: string | undefined =
  process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI: string = "locketupload.spotify://oauth";

const SPOTIFY_TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

if (!SPOTIFY_CLIENT_SECRET) {
  console.error(
    "FATAL ERROR: SPOTIFY_CLIENT_SECRET is not defined in environment variables."
  );
  process.exit(1); // Thoát nếu thiếu biến môi trường quan trọng
}

const getSpotifyTokens = async (
  code: string
): Promise<SpotifyTokenResponse> => {
  const basicAuth = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const requestBody = {
    grant_type: "authorization_code",
    code: code,
    redirect_uri: REDIRECT_URI,
  };

  try {
    const response = await axios.post<SpotifyTokenResponse>(
      SPOTIFY_TOKEN_ENDPOINT,
      querystring.stringify(requestBody),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
        timeout: 10000, // timeout 10 giây
      }
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<SpotifyErrorResponse>;
    if (axiosError.response) {
      console.error(
        "Spotify API Error:",
        axiosError.response.status,
        axiosError.response.data
      );
      throw new Error(
        axiosError.response.data?.error_description ||
          `Spotify API Error: ${axiosError.response.status}`
      );
    } else {
      console.error(
        "Network or other error calling Spotify:",
        axiosError.message
      );
      throw new Error("Failed to connect to Spotify token endpoint.");
    }
  }
};

const refreshSpotifyTokens = async (refreshToken: string) => {
  const basicAuth = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const requestBody = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  };

  try {
    const response = await axios.post(SPOTIFY_TOKEN_ENDPOINT, requestBody, {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + basicAuth,
      },
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<SpotifyErrorResponse>;
    if (axiosError.response) {
      console.error(
        "Spotify API Error:",
        axiosError.response.status,
        axiosError.response.data
      );
      throw new Error(
        axiosError.response.data?.error_description ||
          `Spotify API Error: ${axiosError.response.status}`
      );
    } else {
      console.error(
        "Network or other error calling Spotify:",
        axiosError.message
      );
      throw new Error("Failed to connect to Spotify token endpoint.");
    }
  }
};

export const spotifyService = {
  getSpotifyTokens,
  refreshSpotifyTokens,
};
