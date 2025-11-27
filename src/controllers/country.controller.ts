import type { Response } from "express";
import { Request } from "@middleware/auth.middleware";
import { sendResponse } from "@utils/functions";
import { CountryService } from "@services/country.service";

const service = new CountryService();

export const getCountries = async (req: Request, res: Response) => {
    const { page = "1", limit = "50", search, sortBy, sortOrder } = req.query;
    const enterpriseId = req.auth?.enterpriseId;

    const result = await service.getAll(
        Number(page),
        Number(limit),
        search?.toString(),
        sortBy?.toString(),
        (sortOrder?.toString() as "asc" | "desc" | undefined) ?? "asc",
        enterpriseId
    );

    return sendResponse(res, result, "Countries fetched successfully");
};
