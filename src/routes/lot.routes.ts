import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import { getAllLots, getLotById, createLot, updateLot } from "@controllers/lot.controller";
import {
    validateLotFields,
    validateLotListQuery,
    validateLotQuery,
} from "@middleware/lot.middleware";

export const lotAllowedSortFields = [
    "code",
    "harvestDate",
    "expiration",
    "notes",
    "createdAt",
    "updatedAt",
];

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateLotListQuery({
        allowedSortFields: lotAllowedSortFields,
    }),
    getAllLots
);
router.get("/:id", validateLotQuery, getLotById);
router.post("/", validateLotFields, createLot);
router.put("/:id", validateLotFields, updateLot);

export default router;
