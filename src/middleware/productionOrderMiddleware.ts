import { ProductionOrderInputData } from "@services/productionOrder.service";
import { Request, Response, NextFunction } from "express";
import { ProductionOrderStatus } from "@prisma/client";

export const PRODUCTION_ORDER_ERROR = {
    PAGINATION: "page and limit must be numbers",
    INVALID_STATUS: "status must be a valid ProductionOrderStatus",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
};

export const validateProductionOrderPaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10", status } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.PAGINATION });
    }

    if (status && !Object.values(ProductionOrderStatus).includes(status as ProductionOrderStatus)) {
        return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.INVALID_STATUS });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();
    if (status) req.query.status = status as string;

    next();
};

export const validateProductionOrderFields = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const order = req.body as ProductionOrderInputData;

    if (!order || !order.code || !order.productId || order.plannedQty === undefined) {
        return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.MISSING_FIELDS });
    }

    if (order.status && !Object.values(ProductionOrderStatus).includes(order.status)) {
        return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.WRONG_FIELD_VALUE });
    }

    next();
};

