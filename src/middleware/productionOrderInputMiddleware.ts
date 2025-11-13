import { ProductionOrderInputInput } from "@services/productionOrderInput.service";
import { Request, Response, NextFunction } from "express";

export const PRODUCTION_ORDER_INPUT_ERROR = {
    PAGINATION: "page and limit must be numbers",
    INVALID_ORDER: "productionOrderId must be a number",
    MISSING_FIELDS: "Required fields not provided",
};

export const validateProductionOrderInputPaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10", productionOrderId } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const orderNum = productionOrderId !== undefined ? Number(productionOrderId) : undefined;

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: PRODUCTION_ORDER_INPUT_ERROR.PAGINATION });
    }

    if (productionOrderId !== undefined && Number.isNaN(orderNum)) {
        return res.status(400).json({ message: PRODUCTION_ORDER_INPUT_ERROR.INVALID_ORDER });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();
    if (orderNum !== undefined) req.query.productionOrderId = orderNum.toString();

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

