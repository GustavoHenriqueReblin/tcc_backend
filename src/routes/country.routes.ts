import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import { getCountries } from "@controllers/country.controller";
import { validateCountryListQuery } from "@middleware/country.middleware";

export const countryAllowedSortFields = ["name", "isoCode", "id"];

const router = Router();

router.use(authMiddleware);

router.get("/", validateCountryListQuery(countryAllowedSortFields), getCountries);

export default router;
