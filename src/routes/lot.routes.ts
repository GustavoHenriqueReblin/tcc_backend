import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import { getAllLots, getLotById, createLot, updateLot } from "@controllers/lot.controller";
import { validateLotFields, validateLotPaginationAndFilter } from "@middleware/lotMiddleware";

const router = Router();

router.use(authMiddleware, validateLotPaginationAndFilter);

router.get("/", getAllLots);
router.get("/:id", getLotById);
router.post("/", validateLotFields, createLot);
router.put("/:id", validateLotFields, updateLot);

export default router;
