import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
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
} from "@middleware/unity.middleware";

export const unityAllowedSortFields = ["simbol", "description", "createdAt", "updatedAt"];

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateUnitiesQuery({
        allowSearch: true,
        allowedSortFields: unityAllowedSortFields,
    }),
    getAllUnities
);
router.get("/:id", validateUnityQuery, getUnityById);
router.post("/", validateUnityFields, createUnity);
router.put("/:id", validateUnityFields, updateUnity);

export default router;
