import { PurchaseOrderItemInput } from "@services/purchaseOrderItem.service";
import { Request, Response, NextFunction } from "express";

export const PURCHASE_ORDER_ITEM_ERROR = {
    ID: "Invalid Id parameter",
    PAGINATION: "page and limit must be numbers",
    INVALID_ORDER: "purchaseOrderId must be a number",
    MISSING_FIELDS: "Required fields not provided",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
};

export interface PurchaseOrderItemListQueryOptions {
    allowedSortFields?: string[];
}

export const validatePurchaseOrderItemQuery = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: PURCHASE_ORDER_ITEM_ERROR.ID });
    }

    next();
};

export const validatePurchaseOrderItemListQuery =
    (options: PurchaseOrderItemListQueryOptions = {}) =>
    (req: Request, res: Response, next: NextFunction) => {
        const { allowedSortFields = [] } = options;

        let { page = "1", limit = "10", purchaseOrderId, search, sortBy, sortOrder } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const orderNum = purchaseOrderId !== undefined ? Number(purchaseOrderId) : undefined;

        if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
            return res.status(400).json({ message: PURCHASE_ORDER_ITEM_ERROR.PAGINATION });
        }

        if (purchaseOrderId !== undefined && Number.isNaN(orderNum)) {
            return res.status(400).json({ message: PURCHASE_ORDER_ITEM_ERROR.INVALID_ORDER });
        }

        if (typeof search === "string") {
            search = search.trim();
            if (search.length === 0) search = undefined;
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: PURCHASE_ORDER_ITEM_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: PURCHASE_ORDER_ITEM_ERROR.SORT });
        }

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        if (orderNum !== undefined) req.query.purchaseOrderId = orderNum.toString();
        req.query.search = search?.toString();
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = sortOrder?.toString() || "desc";

        next();
    };

export const validatePurchaseOrderItemFields = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const item = req.body as PurchaseOrderItemInput;

    if (
        !item ||
        !item.purchaseOrderId ||
        !item.productId ||
        item.quantity === undefined ||
        item.unitCost === undefined
    ) {
        return res.status(400).json({ message: PURCHASE_ORDER_ITEM_ERROR.MISSING_FIELDS });
    }

    next();
};
