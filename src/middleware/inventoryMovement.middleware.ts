import { InventoryMovementInput } from "@services/inventoryMovement.service";
import { Request, Response, NextFunction } from "express";

export const INVENTORY_MOVEMENT_ERROR = {
    PAGINATION: "page and limit must be numbers",
    MISSING_PRODUCT: "productId query param is required",
    INVALID_PRODUCT: "productId must be a number",
    MISSING_FIELDS: "Required fields not provided",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
};

export interface InventoryMovementQueryValidationOptions {
    allowSearch?: boolean;
    allowedSortFields?: string[];
}

export const validateInventoryMovementPaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { productId } = req.query;

    if (productId === undefined || productId === null || productId === "") {
        return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.MISSING_PRODUCT });
    }

    const productNum = Number(productId);

    if (Number.isNaN(productNum)) {
        return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.INVALID_PRODUCT });
    }

    req.query.productId = productNum.toString();

    next();
};

export function validateInventoryMovementsQuery(
    options: InventoryMovementQueryValidationOptions = {}
) {
    const { allowSearch = true, allowedSortFields = [] } = options;

    return (req: Request, res: Response, next: NextFunction) => {
        let { page = "1", limit = "10", search, sortBy, sortOrder } = req.query;

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

        return next();
    };
}

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
