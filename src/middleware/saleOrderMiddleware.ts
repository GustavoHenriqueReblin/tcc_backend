import { SaleOrderInput } from "@services/saleOrder.service";
import { Request, Response, NextFunction } from "express";
import { OrderStatus } from "@prisma/client";

export const SALE_ORDER_ERROR = {
    PAGINATION: "page and limit must be numbers",
    INVALID_STATUS: "status must be a valid OrderStatus",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
};

export const validateSaleOrderPaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10", status } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: SALE_ORDER_ERROR.PAGINATION });
    }

    if (status && !Object.values(OrderStatus).includes(status as OrderStatus)) {
        return res.status(400).json({ message: SALE_ORDER_ERROR.INVALID_STATUS });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();
    if (status) req.query.status = status as string;

    next();
};

export const validateSaleOrderFields = (req: Request, res: Response, next: NextFunction) => {
    const order = req.body as SaleOrderInput;

    if (!order || !order.customerId || !order.code || order.totalValue === undefined) {
        return res.status(400).json({ message: SALE_ORDER_ERROR.MISSING_FIELDS });
    }

    if (order.status && !Object.values(OrderStatus).includes(order.status)) {
        return res.status(400).json({ message: SALE_ORDER_ERROR.WRONG_FIELD_VALUE });
    }

    next();
};
