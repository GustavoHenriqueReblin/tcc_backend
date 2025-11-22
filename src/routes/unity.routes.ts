import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    getAllUnities,
    getUnityById,
    createUnity,
    updateUnity,
} from "@controllers/unity.controller";
import {
    validateUnityFields,
    validateUnityQuery,
    validateUnitiesQuery,
} from "@middleware/unityMiddleware";

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateUnitiesQuery({
        allowSearch: true,
        allowedSortFields: ["simbol", "description", "createdAt", "updatedAt"],
    }),
    getAllUnities
);
router.get("/:id", validateUnityQuery, getUnityById);
router.post("/", validateUnityFields, createUnity);
router.put("/:id", validateUnityFields, updateUnity);

export default router;
