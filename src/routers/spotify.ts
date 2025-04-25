// src/routes/spotify.routes.ts
import { Router } from "express";
import { exchangeCodeController } from "../controllers/spotify.controller";

const router = Router();

router.post("/spotify/exchange-code", exchangeCodeController);

export default router;
