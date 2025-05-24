import { Router } from "express";
import { checkToken } from "../middleware/oauth";
import {
  activateOneKey,
  banned,
  createKey,
  deleteEmail,
  deleteKey,
  getAllEmails,
  unbanded,
} from "../controllers/user.controller";
import { asyncHandler } from "../utils/asyncHandler";
const router = Router();
router.get("/users", checkToken, asyncHandler(getAllEmails));
router.post("/users/generate-key", checkToken, asyncHandler(createKey));
router.post("/users/activate-key", asyncHandler(activateOneKey));
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
router.patch("/users/:email", checkToken, asyncHandler(banned));
router.put("/users/:email", checkToken, asyncHandler(unbanded));
export default router;
