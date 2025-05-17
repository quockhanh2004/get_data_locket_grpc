import { Router } from "express";
import { checkToken } from "../middleware/oauth";
import {
  createKey,
  deleteEmail,
  deleteKey,
  getAllEmails,
} from "../controllers/user.controller";
import { asyncHandler } from "../utils/asyncHandler";
const router = Router();
router.get("/users", checkToken, asyncHandler(getAllEmails));
router.post("/users/generate-key", checkToken, asyncHandler(createKey));
router.delete(
  "/users/delete-key/:deleteKey",
  checkToken,
  asyncHandler(deleteKey)
);
router.delete(
  "/users/delete-email/:email",
  checkToken,
  asyncHandler(deleteEmail)
);
export default router;
