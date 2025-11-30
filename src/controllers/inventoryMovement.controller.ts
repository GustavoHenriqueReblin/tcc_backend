import type { Response } from "express";
import { sendResponse } from "@utils/functions";
import { Request } from "@middleware/auth.middleware";
import { InventoryAdjustmentInput, InventoryMovementService } from "@services/inventoryMovement.service";
import { MovementSource, MovementType } from "@prisma/client";

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

export const createInventoryAdjustment = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;
    const { productId, quantity, warehouseId, notes } = req.body as InventoryAdjustmentInput;

    const result = await service.create(
        enterpriseId,
        {
            productId,
            quantity,
            warehouseId,
            notes,
            direction: MovementType.IN,
            source: MovementSource.ADJUSTMENT,
        },
        userId
    );

    return sendResponse(res, result, "Inventory adjustment created successfully");
};
