// src/routes/spotify.routes.ts
import { Router } from "express";
import { exchangeCodeController, refreshTokenController } from "../controllers/spotify.controller";

const router = Router();

router.post("/spotify/exchange-code", exchangeCodeController);
router.post("/spotify/refresh", refreshTokenController);

export default router;
