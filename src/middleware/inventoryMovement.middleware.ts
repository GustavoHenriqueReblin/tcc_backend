import {
    HarvestInput,
    InventoryAdjustmentInput,
    InventoryMovementInput,
} from "@services/inventoryMovement.service";
import { MovementSource, MovementType } from "@prisma/client";
import { Request, Response, NextFunction } from "express";

export const INVENTORY_MOVEMENT_ERROR = {
    PAGINATION: "page and limit must be numbers",
    INVALID_PRODUCT: "productId must be a number",
    INVALID_START_DATE: "startDate must be a valid date",
    INVALID_END_DATE: "endDate must be a valid date",
    INVALID_MOVEMENT_TYPE: "movementType must be a valid MovementType",
    INVALID_SOURCE: "source must be a valid MovementSource",
    MISSING_FIELDS: "Required fields not provided",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
    INVALID_ADJUSTMENT_FIELDS: "productId, quantity and warehouseId must be valid numbers",
    INVALID_HARVEST_FIELDS: "productId, quantity and warehouseId must be valid numbers",
};

export interface InventoryMovementListQueryOptions {
    allowSearch?: boolean;
    allowedSortFields?: string[];
}

export const validateInventoryMovementListQuery =
    (options: InventoryMovementListQueryOptions = {}) =>
    (req: Request, res: Response, next: NextFunction) => {
        const { allowSearch = true, allowedSortFields = [] } = options;

        let {
            page = "1",
            limit = "200",
            search,
            sortBy,
            sortOrder,
            productId,
            startDate,
            endDate,
            movementType,
            source,
        } = req.query;

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
        if (productId !== undefined && productId !== null && productId !== "") {
            const productNum = Number(productId);
            if (Number.isNaN(productNum)) {
                return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.INVALID_PRODUCT });
            }
            normalizedProductId = productNum.toString();
        } else {
            normalizedProductId = undefined;
        }

        const parseDate = (value?: unknown) => {
            if (value === undefined || value === null) return undefined;
            const parsed = value.toString().trim();
            if (parsed.length === 0) return undefined;

            const dateVal = new Date(parsed);
            if (Number.isNaN(dateVal.getTime())) return null;
            return dateVal.toISOString();
        };

        const startDateVal = parseDate(startDate);
        if (startDateVal === null) {
            return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.INVALID_START_DATE });
        }

        const endDateVal = parseDate(endDate);
        if (endDateVal === null) {
            return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.INVALID_END_DATE });
        }

        if (movementType && !Object.values(MovementType).includes(movementType as MovementType)) {
            return res
                .status(400)
                .json({ message: INVENTORY_MOVEMENT_ERROR.INVALID_MOVEMENT_TYPE });
        }

        if (source && !Object.values(MovementSource).includes(source as MovementSource)) {
            return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.INVALID_SOURCE });
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
        req.query.sortBy = sortBy?.toString() || "createdAt";
        req.query.sortOrder = sortOrder?.toString() || "desc";
        if (normalizedProductId !== undefined) {
            req.query.productId = normalizedProductId.toString();
        }
        req.query.startDate = startDateVal;
        req.query.endDate = endDateVal;
        if (movementType) req.query.movementType = movementType as string;
        if (source) req.query.source = source as string;

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

export const validateHarvestFields = (req: Request, res: Response, next: NextFunction) => {
    const { productId, quantity, warehouseId, notes } = req.body ?? {};

    if (productId === undefined || quantity === undefined || warehouseId === undefined) {
        return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.MISSING_FIELDS });
    }

    const productNum = Number(productId);
    const quantityNum = Number(quantity);
    const warehouseNum = Number(warehouseId);

    if (Number.isNaN(productNum) || Number.isNaN(quantityNum) || Number.isNaN(warehouseNum)) {
        return res.status(400).json({ message: INVENTORY_MOVEMENT_ERROR.INVALID_HARVEST_FIELDS });
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
    } as HarvestInput;

    next();
};
