import { SaleOrderItemInput } from "@services/saleOrderItem.service";
import { Request, Response, NextFunction } from "express";

export const SALE_ORDER_ITEM_ERROR = {
    PAGINATION: "page and limit must be numbers",
    INVALID_ORDER: "saleOrderId must be a number",
    MISSING_FIELDS: "Required fields not provided",
};

export const validateSaleOrderItemPaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10", saleOrderId } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const orderNum = saleOrderId !== undefined ? Number(saleOrderId) : undefined;

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: SALE_ORDER_ITEM_ERROR.PAGINATION });
    }

    if (saleOrderId !== undefined && Number.isNaN(orderNum)) {
        return res.status(400).json({ message: SALE_ORDER_ITEM_ERROR.INVALID_ORDER });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();
    if (orderNum !== undefined) req.query.saleOrderId = orderNum.toString();

    next();
};

export const validateSaleOrderItemFields = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
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

