import { PurchaseOrderInput } from "@services/purchaseOrder.service";
import { isValidNestedItemsPayload } from "@middleware/nestedItems.middleware";
import { Request, Response, NextFunction } from "express";
import { OrderStatus } from "@prisma/client";

export const PURCHASE_ORDER_ERROR = {
    ID: "Invalid Id parameter",
    PAGINATION: "page and limit must be numbers",
    INVALID_STATUS: "status must be a valid OrderStatus",
    MISSING_FIELDS: "Required fields not provided",
    ITEMS_STRUCTURE: "Invalid items payload",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
};

export interface PurchaseOrderListQueryOptions {
    allowedSortFields?: string[];
}

export const validatePurchaseOrderQuery = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: PURCHASE_ORDER_ERROR.ID });
    }

    next();
};

export const validatePurchaseOrderListQuery =
    (options: PurchaseOrderListQueryOptions = {}) =>
    (req: Request, res: Response, next: NextFunction) => {
        const { allowedSortFields = [] } = options;
        let { page = "1", limit = "10", status, search, sortBy, sortOrder } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);

        if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
            return res.status(400).json({ message: PURCHASE_ORDER_ERROR.PAGINATION });
        }

        if (status && !Object.values(OrderStatus).includes(status as OrderStatus)) {
            return res.status(400).json({ message: PURCHASE_ORDER_ERROR.INVALID_STATUS });
        }

        if (typeof search === "string") {
            search = search.trim();
            if (search.length === 0) search = undefined;
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: PURCHASE_ORDER_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: PURCHASE_ORDER_ERROR.SORT });
        }

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        if (status) req.query.status = status as string;
        req.query.search = search?.toString();
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = sortOrder?.toString() || "desc";

        next();
    };

export const validatePurchaseOrderFields = (req: Request, res: Response, next: NextFunction) => {
    const order = req.body as PurchaseOrderInput;

    if (!order || !order.supplierId || !order.code) {
        return res.status(400).json({ message: PURCHASE_ORDER_ERROR.MISSING_FIELDS });
    }

    if (
        order.items &&
        !isValidNestedItemsPayload(order.items, {
            createRequiredFields: ["productId", "quantity", "unitCost"],
            numericUpdateFields: ["productId", "quantity", "unitCost"],
        })
    ) {
        return res.status(400).json({ message: PURCHASE_ORDER_ERROR.ITEMS_STRUCTURE });
    }

    next();
};
