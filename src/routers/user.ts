import { Router } from "express";
import { checkToken as checkAdmin } from "../middleware/oauth";
import {
  activateOneKey,
  banned,
  clearNotActivatedKeys,
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
router.get("/users/client-gen-key/:email", asyncHandler(clientRequestGenKey));

router.post("/users/generate-key", checkAdmin, asyncHandler(createKey));
router.post("/users/activate-key", asyncHandler(activateOneKey));

router.patch("/users/:email", checkAdmin, asyncHandler(banned));
router.put("/users/:email", checkAdmin, asyncHandler(unbanded));

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
router.delete(
  "/users/key-not-activate",
  checkAdmin,
  asyncHandler(clearNotActivatedKeys)
);

export default router;
