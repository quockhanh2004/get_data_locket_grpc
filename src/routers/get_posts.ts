import express from "express";
import { handleGetPosts } from "../controllers/postController";

const router = express.Router();
router.post("/posts", handleGetPosts as any);

export default router;
