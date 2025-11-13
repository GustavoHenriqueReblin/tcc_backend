import { PurchaseOrderInput } from "@services/purchaseOrder.service";
import { Request, Response, NextFunction } from "express";
import { OrderStatus } from "@prisma/client";

export const PURCHASE_ORDER_ERROR = {
    PAGINATION: "page and limit must be numbers",
    INVALID_STATUS: "status must be a valid OrderStatus",
    MISSING_FIELDS: "Required fields not provided",
};

export const validatePurchaseOrderPaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10", status } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: PURCHASE_ORDER_ERROR.PAGINATION });
    }

    if (status && !Object.values(OrderStatus).includes(status as OrderStatus)) {
        return res.status(400).json({ message: PURCHASE_ORDER_ERROR.INVALID_STATUS });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();
    if (status) req.query.status = status as string;

    next();
};

export const validatePurchaseOrderFields = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const order = req.body as PurchaseOrderInput;

    if (!order || !order.supplierId || !order.code) {
        return res.status(400).json({ message: PURCHASE_ORDER_ERROR.MISSING_FIELDS });
    }

    next();
};

