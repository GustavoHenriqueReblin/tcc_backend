import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import { getCities } from "@controllers/city.controller";
import { validateCityListQuery } from "@middleware/city.middleware";

export const cityAllowedSortFields = ["name", "ibgeCode", "id"];

const router = Router();

router.use(authMiddleware);

router.get("/", validateCityListQuery(cityAllowedSortFields), getCities);

export default router;
