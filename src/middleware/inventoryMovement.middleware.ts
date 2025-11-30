import {
    InventoryAdjustmentInput,
    InventoryMovementInput,
} from "@services/inventoryMovement.service";
import { Request, Response, NextFunction } from "express";

export const INVENTORY_MOVEMENT_ERROR = {
    PAGINATION: "page and limit must be numbers",
    MISSING_PRODUCT: "productId query param is required",
    INVALID_PRODUCT: "productId must be a number",
    MISSING_FIELDS: "Required fields not provided",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
    INVALID_ADJUSTMENT_FIELDS: "productId, quantity and warehouseId must be valid numbers",
    INVALID_ADJUSTMENT_QUANTITY: "quantity must be greater than zero",
};

export interface InventoryMovementListQueryOptions {
    allowSearch?: boolean;
    allowedSortFields?: string[];
    requireProductId?: boolean;
}

export const validateInventoryMovementListQuery =
    (options: InventoryMovementListQueryOptions = {}) =>
    (req: Request, res: Response, next: NextFunction) => {
        const { allowSearch = true, allowedSortFields = [], requireProductId = true } = options;

        let { page = "1", limit = "10", search, sortBy, sortOrder, productId } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);

        if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
            return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.PAGINATION });
        }

        if (!allowSearch && search !== undefined) {
            return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.SEARCH });
        }

        if (typeof search === "string") {
            search = search.trim();
            if (search.length === 0) search = undefined;
        }

        let normalizedProductId = productId;
        if (
            requireProductId &&
            (productId === undefined || productId === null || productId === "")
        ) {
            return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.MISSING_PRODUCT });
        }

        if (productId !== undefined && productId !== null && productId !== "") {
            const productNum = Number(productId);
            if (Number.isNaN(productNum)) {
                return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.INVALID_PRODUCT });
            }
            normalizedProductId = productNum.toString();
        } else {
            normalizedProductId = undefined;
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.SORT });
        }

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        req.query.search = search?.toString();
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = sortOrder?.toString() || "desc";
        if (normalizedProductId !== undefined) {
            req.query.productId = normalizedProductId.toString();
        }

        return next();
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

export const validateInventoryAdjustmentFields = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { productId, quantity, warehouseId, notes } = req.body ?? {};

    if (productId === undefined || quantity === undefined || warehouseId === undefined) {
        return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.MISSING_FIELDS });
    }

    const productNum = Number(productId);
    const quantityNum = Number(quantity);
    const warehouseNum = Number(warehouseId);

    if (Number.isNaN(productNum) || Number.isNaN(quantityNum) || Number.isNaN(warehouseNum)) {
        return res
            .status(400)
            .json({ message: INVENTORY_MOVEMENT_ERROR.INVALID_ADJUSTMENT_FIELDS });
    }

    if (quantityNum <= 0) {
        return res
            .status(400)
            .json({ message: INVENTORY_MOVEMENT_ERROR.INVALID_ADJUSTMENT_QUANTITY });
    }

    let parsedNotes: string | undefined;
    if (notes !== undefined && notes !== null) {
        parsedNotes = String(notes).trim();
        if (parsedNotes.length === 0) parsedNotes = undefined;
    }

    req.body = {
        productId: productNum,
        quantity: quantityNum,
        warehouseId: warehouseNum,
        ...(parsedNotes ? { notes: parsedNotes } : {}),
    } as InventoryAdjustmentInput;

    next();
};
