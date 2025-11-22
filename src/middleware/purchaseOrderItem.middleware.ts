import { PurchaseOrderItemInput } from "@services/purchaseOrderItem.service";
import { Request, Response, NextFunction } from "express";

export const PURCHASE_ORDER_ITEM_ERROR = {
    PAGINATION: "page and limit must be numbers",
    INVALID_ORDER: "purchaseOrderId must be a number",
    MISSING_FIELDS: "Required fields not provided",
};

export const validatePurchaseOrderItemPaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10", purchaseOrderId } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const orderNum = purchaseOrderId !== undefined ? Number(purchaseOrderId) : undefined;

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: PURCHASE_ORDER_ITEM_ERROR.PAGINATION });
    }

    if (purchaseOrderId !== undefined && Number.isNaN(orderNum)) {
        return res.status(400).json({ message: PURCHASE_ORDER_ITEM_ERROR.INVALID_ORDER });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();
    if (orderNum !== undefined) req.query.purchaseOrderId = orderNum.toString();

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
