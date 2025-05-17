import express from "express";
import handleGetFriends from "../controllers/friend.controller";

const router = express.Router();
router.post("/listen", handleGetFriends as any);

export default router;
