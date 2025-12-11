import type { Response } from "express";
import { Request } from "@middleware/auth.middleware";
import { sendResponse } from "@utils/functions";
import { stateService as service } from "@services/services";

export const getStates = async (req: Request, res: Response) => {
    const { countryId, page = "1", limit = "100", search, sortBy, sortOrder } = req.query;
    const enterpriseId = req.auth?.enterpriseId;

    const result = await service.getAll(
        Number(countryId),
        Number(page),
        Number(limit),
        search?.toString(),
        sortBy?.toString(),
        (sortOrder?.toString() as "asc" | "desc" | undefined) ?? "asc",
        enterpriseId
    );

    return sendResponse(res, result, "States fetched successfully");
};
