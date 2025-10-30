import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import { getAllUnities, getUnityById, createUnity, updateUnity } from "@controllers/unity.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", getAllUnities);
router.get("/:id", getUnityById);
router.post("/", createUnity);
router.put("/:id", updateUnity);

export default router;

