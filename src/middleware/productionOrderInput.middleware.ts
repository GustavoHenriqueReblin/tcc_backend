import { ProductionOrderInputInput } from "@services/productionOrderInput.service";
import { Request, Response, NextFunction } from "express";

export const PRODUCTION_ORDER_INPUT_ERROR = {
    ID: "Invalid Id parameter",
    PAGINATION: "page and limit must be numbers",
    INVALID_ORDER: "productionOrderId must be a number",
    MISSING_FIELDS: "Required fields not provided",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
};

export interface ProductionOrderInputListQueryOptions {
    allowedSortFields?: string[];
}

export const validateProductionOrderInputQuery = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: PRODUCTION_ORDER_INPUT_ERROR.ID });
    }

    next();
};

export const validateProductionOrderInputListQuery =
    (options: ProductionOrderInputListQueryOptions = {}) =>
    (req: Request, res: Response, next: NextFunction) => {
        const { allowedSortFields = [] } = options;

        let { page = "1", limit = "10", productionOrderId, search, sortBy, sortOrder } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const orderNum = productionOrderId !== undefined ? Number(productionOrderId) : undefined;

        if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
            return res.status(400).json({ message: PRODUCTION_ORDER_INPUT_ERROR.PAGINATION });
        }

        if (productionOrderId !== undefined && Number.isNaN(orderNum)) {
            return res.status(400).json({ message: PRODUCTION_ORDER_INPUT_ERROR.INVALID_ORDER });
        }

        if (typeof search === "string") {
            search = search.trim();
            if (search.length === 0) search = undefined;
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: PRODUCTION_ORDER_INPUT_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: PRODUCTION_ORDER_INPUT_ERROR.SORT });
        }

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        if (orderNum !== undefined) req.query.productionOrderId = orderNum.toString();
        req.query.search = search?.toString();
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = sortOrder?.toString() || "desc";

        next();
    };

export const validateProductionOrderInputFields = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const item = req.body as ProductionOrderInputInput;

    if (!item || !item.productionOrderId || !item.productId || item.quantity === undefined) {
        return res.status(400).json({ message: PRODUCTION_ORDER_INPUT_ERROR.MISSING_FIELDS });
    }

    next();
};
