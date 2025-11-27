import type { Response } from "express";
import { Request } from "@middleware/auth.middleware";
import { sendResponse } from "@utils/functions";
import { CityService } from "@services/city.service";

const service = new CityService();

export const getCities = async (req: Request, res: Response) => {
    const { stateId, countryId, page = "1", limit = "100", search, sortBy, sortOrder } = req.query;
    const enterpriseId = req.auth?.enterpriseId;

    const result = await service.getAll(
        Number(stateId),
        countryId !== undefined ? Number(countryId) : undefined,
        Number(page),
        Number(limit),
        search?.toString(),
        sortBy?.toString(),
        (sortOrder?.toString() as "asc" | "desc" | undefined) ?? "asc",
        enterpriseId
    );

    return sendResponse(res, result, "Cities fetched successfully");
};
