import express from "express";
import {
  getReactionPost,
  handleGetPosts,
} from "../controllers/post.controller";
import { checkKeyActivated } from "../middleware/oauth";

const router = express.Router();
router.post("/posts", checkKeyActivated, handleGetPosts as any);
router.post("/posts/:postId", checkKeyActivated, getReactionPost as any);

export default router;
