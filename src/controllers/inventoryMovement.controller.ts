import type { Response } from "express";
import { sendResponse } from "@utils/functions";
import { Request } from "@middleware/auth.middleware";
import { HarvestInput, InventoryAdjustmentInput } from "@services/inventoryMovement.service";
import { inventoryMovementService as service } from "@services/services";
import { MovementSource, MovementType } from "@prisma/client";

export const getInventoryMovements = async (req: Request, res: Response) => {
    const {
        page = "1",
        limit = "200",
        productId,
        search,
        sortBy,
        sortOrder,
        startDate,
        endDate,
        movementType,
        source,
    } = req.query;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getAll(
        enterpriseId,
        Number(page),
        Number(limit),
        productId !== undefined ? Number(productId) : undefined,
        search?.toString() ?? undefined,
        sortBy?.toString(),
        (sortOrder?.toString() as "asc" | "desc" | undefined) ?? "desc",
        startDate ? new Date(startDate.toString()) : undefined,
        endDate ? new Date(endDate.toString()) : undefined,
        movementType ? (movementType.toString() as MovementType) : undefined,
        source ? (source.toString() as MovementSource) : undefined
    );
    return sendResponse(res, result, "Inventory movements fetched successfully");
};

export const createInventoryAdjustment = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const { productId, quantity, warehouseId, notes } = req.body as InventoryAdjustmentInput;

    const result = await service.createAdjustment(
        enterpriseId,
        {
            productId,
            quantity,
            warehouseId,
            notes,
        },
        userId
    );

    return sendResponse(res, result, "Inventory adjustment created successfully");
};

export const createHarvestEntry = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const { productId, quantity, unitCost, warehouseId, notes } = req.body as HarvestInput;

    const result = await service.createHarvestEntry(
        enterpriseId,
        {
            productId,
            quantity,
            unitCost,
            warehouseId,
            notes,
        },
        userId
    );

    return sendResponse(res, result, "Inventory adjustment created successfully");
};
