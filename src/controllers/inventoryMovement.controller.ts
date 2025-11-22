import type { Response } from "express";
import { sendResponse } from "@utils/functions";
import { Request } from "@middleware/authMiddleware";
import { InventoryMovementService } from "@services/inventoryMovement.service";

const service = new InventoryMovementService();

export const getInventoryMovements = async (req: Request, res: Response) => {
    const { page = "1", limit = "10", productId, search, sortBy, sortOrder } = req.query;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getAll(
        enterpriseId,
        Number(page),
        Number(limit),
        Number(productId),
        search?.toString() ?? undefined,
        sortBy?.toString(),
        (sortOrder?.toString() as "asc" | "desc" | undefined) ?? "desc"
    );
    return sendResponse(res, result, "Inventory movements fetched successfully");
};
