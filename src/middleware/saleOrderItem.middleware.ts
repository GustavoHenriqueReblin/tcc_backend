import { SaleOrderItemInput } from "@services/saleOrderItem.service";
import { Request, Response, NextFunction } from "express";

export const SALE_ORDER_ITEM_ERROR = {
    ID: "Invalid Id parameter",
    PAGINATION: "page and limit must be numbers",
    INVALID_ORDER: "saleOrderId must be a number",
    MISSING_FIELDS: "Required fields not provided",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
};

export interface SaleOrderItemListQueryOptions {
    allowedSortFields?: string[];
}

export const validateSaleOrderItemQuery = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: SALE_ORDER_ITEM_ERROR.ID });
    }

    next();
};

export const validateSaleOrderItemListQuery =
    (options: SaleOrderItemListQueryOptions = {}) =>
    (req: Request, res: Response, next: NextFunction) => {
        const { allowedSortFields = [] } = options;

        let { page = "1", limit = "10", saleOrderId, search, sortBy, sortOrder } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const orderNum = saleOrderId !== undefined ? Number(saleOrderId) : undefined;

        if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
            return res.status(400).json({ message: SALE_ORDER_ITEM_ERROR.PAGINATION });
        }

        if (saleOrderId !== undefined && Number.isNaN(orderNum)) {
            return res.status(400).json({ message: SALE_ORDER_ITEM_ERROR.INVALID_ORDER });
        }

        if (typeof search === "string") {
            search = search.trim();
            if (search.length === 0) search = undefined;
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: SALE_ORDER_ITEM_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: SALE_ORDER_ITEM_ERROR.SORT });
        }

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        if (orderNum !== undefined) req.query.saleOrderId = orderNum.toString();
        req.query.search = search?.toString();
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = sortOrder?.toString() || "desc";

        next();
    };

export const validateSaleOrderItemFields = (req: Request, res: Response, next: NextFunction) => {
    const item = req.body as SaleOrderItemInput;

    if (
        !item ||
        !item.saleOrderId ||
        !item.productId ||
        item.quantity === undefined ||
        item.unitPrice === undefined ||
        item.productUnitPrice === undefined ||
        item.unitCost === undefined
    ) {
        return res.status(400).json({ message: SALE_ORDER_ITEM_ERROR.MISSING_FIELDS });
    }

    next();
};
