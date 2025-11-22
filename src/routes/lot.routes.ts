import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import { getAllLots, getLotById, createLot, updateLot } from "@controllers/lot.controller";
import { validateLotFields, validateLotPaginationAndFilter } from "@middleware/lot.middleware";

const router = Router();

router.use(authMiddleware, validateLotPaginationAndFilter);

router.get("/", getAllLots);
router.get("/:id", getLotById);
router.post("/", validateLotFields, createLot);
router.put("/:id", validateLotFields, updateLot);

export default router;
