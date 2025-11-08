import { ProductInput } from "@services/product.service";
import { Request, Response, NextFunction } from "express";

export const PRODUCT_ERROR = {
    PAGINATION: "page and limit must be numbers",
    INCLUDE_INACTIVE: "includeInactive must be 'true' or 'false'",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
};

export const validateProductPaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10", includeInactive } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: PRODUCT_ERROR.PAGINATION });
    }

    if (
        includeInactive !== undefined &&
        includeInactive !== "true" &&
        includeInactive !== "false"
    ) {
        return res.status(400).json({ message: PRODUCT_ERROR.INCLUDE_INACTIVE });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();
    req.query.includeInactive = includeInactive?.toLowerCase() === "true" ? "true" : "false";

    next();
};

export const validateProductFields = (req: Request, res: Response, next: NextFunction) => {
    const product = req.body as ProductInput;
    const inventory = product.inventory;

    if (!product || !inventory) {
        return res.status(400).json({ message: PRODUCT_ERROR.MISSING_FIELDS });
    }

    if (!product.name || !inventory.costValue || !inventory.quantity || !inventory.saleValue) {
        return res.status(400).json({ message: PRODUCT_ERROR.MISSING_FIELDS });
    }

    next();
};
