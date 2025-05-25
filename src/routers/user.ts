import { Router } from "express";
import { checkToken as checkAdmin } from "../middleware/oauth";
import {
  activateOneKey,
  banned,
  clientRequestGenKey,
  createKey,
  deleteEmail,
  deleteKey,
  getAllEmails,
  getKeysByEmail,
  unbanded,
} from "../controllers/user.controller";
import { asyncHandler } from "../utils/asyncHandler";
const router = Router();
router.get("/users", checkAdmin, asyncHandler(getAllEmails));
router.get("/users/:email", checkAdmin, asyncHandler(getKeysByEmail));
router.post("/users/generate-key", checkAdmin, asyncHandler(createKey));
router.post("/users/activate-key", asyncHandler(activateOneKey));
router.delete(
  "/users/delete-key/:deleteKey",
  checkAdmin,
  asyncHandler(deleteKey)
);
router.delete(
  "/users/delete-email/:email",
  checkAdmin,
  asyncHandler(deleteEmail)
);
router.patch("/users/:email", checkAdmin, asyncHandler(banned));
router.put("/users/:email", checkAdmin, asyncHandler(unbanded));
router.get("/users/client-gen-key/:email", asyncHandler(clientRequestGenKey));
export default router;
