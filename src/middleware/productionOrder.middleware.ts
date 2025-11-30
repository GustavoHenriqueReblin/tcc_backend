import { ProductionOrderInputData } from "@services/productionOrder.service";
import { Request, Response, NextFunction } from "express";
import { ProductionOrderStatus } from "@prisma/client";

export const PRODUCTION_ORDER_ERROR = {
    ID: "Invalid Id parameter",
    PAGINATION: "page and limit must be numbers",
    INVALID_STATUS: "status must be a valid ProductionOrderStatus",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
};

export interface ProductionOrderListQueryOptions {
    allowSearch?: boolean;
    allowedSortFields?: string[];
}

export const validateProductionOrderQuery = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.ID });
    }

    next();
};

export const validateProductionOrderListQuery =
    (options: ProductionOrderListQueryOptions = {}) =>
    (req: Request, res: Response, next: NextFunction) => {
        const { allowSearch = true, allowedSortFields = [] } = options;

        let { page = "1", limit = "10", search, sortBy, sortOrder, status } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);

        if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
            return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.PAGINATION });
        }

        if (!allowSearch && search !== undefined) {
            return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.SEARCH });
        }

        if (typeof search === "string") {
            search = search.trim();
            if (search.length === 0) search = undefined;
        }

        if (
            status &&
            !Object.values(ProductionOrderStatus).includes(status as ProductionOrderStatus)
        ) {
            return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.INVALID_STATUS });
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.SORT });
        }

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        req.query.search = search?.toString();
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = sortOrder?.toString() || "desc";
        if (status) req.query.status = status as string;

        return next();
    };

export const validateProductionOrderFields = (req: Request, res: Response, next: NextFunction) => {
    const order = req.body as ProductionOrderInputData;

    if (!order || !order.code || !order.productId || order.plannedQty === undefined) {
        return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.MISSING_FIELDS });
    }

    if (order.status && !Object.values(ProductionOrderStatus).includes(order.status)) {
        return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.WRONG_FIELD_VALUE });
    }

    next();
};
