import { InventoryMovementInput } from "@services/inventoryMovement.service";
import { Request, Response, NextFunction } from "express";

export const INVENTORY_MOVEMENT_ERROR = {
    PAGINATION: "page and limit must be numbers",
    MISSING_PRODUCT: "productId query param is required",
    INVALID_PRODUCT: "productId must be a number",
    MISSING_FIELDS: "Required fields not provided",
};

export const validateInventoryMovementPaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10", productId } = req.query;

    if (productId === undefined || productId === null || productId === "") {
        return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.MISSING_PRODUCT });
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const productNum = Number(productId);

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.PAGINATION });
    }

    if (Number.isNaN(productNum)) {
        return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.INVALID_PRODUCT });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();
    req.query.productId = productNum.toString();

    next();
};

export const validateInventoryMovementFields = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const inventoryMovement = req.body as InventoryMovementInput;

    if (!inventoryMovement) {
        return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.MISSING_FIELDS });
    }

    if (
        !inventoryMovement.direction ||
        !inventoryMovement.productId ||
        !inventoryMovement.quantity ||
        !inventoryMovement.source ||
        !inventoryMovement.warehouseId
    ) {
        return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.MISSING_FIELDS });
    }

    next();
};
