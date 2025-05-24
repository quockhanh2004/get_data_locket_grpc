import express from "express";
import {
  getListMessage,
  getMesssageWithUser,
} from "../controllers/message.controller";
import { checkKeyActivated } from "../middleware/oauth";

const router = express.Router();
router.post(
  "/message/:with_user",
  checkKeyActivated,
  getMesssageWithUser as any
);
router.post("/message", getListMessage as any);

export default router;
