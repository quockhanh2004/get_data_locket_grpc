// src/controllers/spotify.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ExchangeCodeRequestBody } from '../models/spotify.model';
import { spotifyService } from '../services/spotify.service';

export const exchangeCodeController = async (
    req: Request<{}, {}, ExchangeCodeRequestBody>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const { code } = req.body;

    if (!code) {
        res.status(400).json({ message: 'Missing authorization code' });
        return;
    }

    try {
        const tokenData = await spotifyService.getSpotifyTokens(code);
        res.json({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in,
        });
    } catch (error: any) {
        console.error('Error in exchangeCodeController:', error.message);
        res.status(500).json({ message: error.message || 'Internal server error while exchanging code' });
    }
};
