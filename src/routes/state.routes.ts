import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import { getStates } from "@controllers/state.controller";
import { validateStateListQuery } from "@middleware/state.middleware";

export const stateAllowedSortFields = ["name", "uf", "ibgeCode", "id"];

const router = Router();

router.use(authMiddleware);

router.get("/", validateStateListQuery(stateAllowedSortFields), getStates);

export default router;
