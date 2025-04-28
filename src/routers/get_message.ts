import express from "express";
import { getListMessage, getMesssageWithUser } from "../controllers/message.controller";

const router = express.Router();
router.post("/message/:with_user", getMesssageWithUser as any);
router.post("/message", getListMessage as any);

export default router;