import express from "express";
import { getReactionPost, handleGetPosts } from "../controllers/post.controller";

const router = express.Router();
router.post("/posts", handleGetPosts as any);
router.post("/posts/:postId", getReactionPost as any);

export default router;
