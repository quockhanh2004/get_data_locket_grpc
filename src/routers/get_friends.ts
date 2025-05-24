import express from "express";
import handleGetFriends from "../controllers/friend.controller";
import { checkKeyActivated } from "../middleware/oauth";

const router = express.Router();
router.post("/listen", checkKeyActivated, handleGetFriends as any);

export default router;
