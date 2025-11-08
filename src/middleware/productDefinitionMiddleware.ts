import { ProductDefinitionType } from "@prisma/client";
import { ProductDefinitionInput } from "@services/productDefinition.service";
import { Request, Response, NextFunction } from "express";

export const PRODUCT_DEFINITION_ERROR = {
    PAGINATION: "page and limit must be numbers",
    INCLUDE_INACTIVE: "includeInactive must be 'true' or 'false'",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
};

export const validateProductDefinitionPaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10", includeInactive } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: PRODUCT_DEFINITION_ERROR.PAGINATION });
    }

    if (
        includeInactive !== undefined &&
        includeInactive !== "true" &&
        includeInactive !== "false"
    ) {
        return res.status(400).json({ message: PRODUCT_DEFINITION_ERROR.INCLUDE_INACTIVE });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();
    req.query.includeInactive = includeInactive?.toLowerCase() === "true" ? "true" : "false";

    next();
};

export const validateProductDefinitionFields = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const productDefinition = req.body as ProductDefinitionInput;

    if (!productDefinition.name || !productDefinition.type) {
        return res.status(400).json({ message: PRODUCT_DEFINITION_ERROR.MISSING_FIELDS });
    }

    if (
        productDefinition.type &&
        !Object.values(ProductDefinitionType).includes(productDefinition.type)
    ) {
        return res.status(400).json({ message: PRODUCT_DEFINITION_ERROR.WRONG_FIELD_VALUE });
    }

    next();
};
