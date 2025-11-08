import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    getAllUnities,
    getUnityById,
    createUnity,
    updateUnity,
} from "@controllers/unity.controller";
import { validateUnityFields, validateUnityPaginationAndFilter } from "@middleware/unityMiddleware";

const router = Router();

router.use(authMiddleware, validateUnityPaginationAndFilter);

router.get("/", getAllUnities);
router.get("/:id", getUnityById);
router.post("/", validateUnityFields, createUnity);
router.put("/:id", validateUnityFields, updateUnity);

export default router;
