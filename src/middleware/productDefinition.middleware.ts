import { ProductDefinitionType } from "@prisma/client";
import { ProductDefinitionInput } from "@services/productDefinition.service";
import { Request, Response, NextFunction } from "express";

export const PRODUCT_DEFINITION_ERROR = {
    ID: "Invalid Id parameter",
    PAGINATION: "page and limit must be numbers",
    INCLUDE_INACTIVE: "includeInactive must be 'true' or 'false'",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
    TYPE: "type must be a valid ProductDefinitionType",
};

export interface ProductDefinitionQueryValidationOptions {
    allowSearch?: boolean;
    allowedSortFields?: string[];
}

export const validateProductDefinitionQuery = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: PRODUCT_DEFINITION_ERROR.ID });
    }

    next();
};

export function validateProductDefinitionsQuery(
    options: ProductDefinitionQueryValidationOptions = {}
) {
    const { allowSearch = true, allowedSortFields = [] } = options;

    return (req: Request, res: Response, next: NextFunction) => {
        let {
            page = "1",
            limit = "10",
            search,
            sortBy,
            sortOrder,
            includeInactive,
            type,
        } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const normalizedType = typeof type === "string" ? type.trim() : type;

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

        if (!allowSearch && search !== undefined) {
            return res.status(400).json({ message: PRODUCT_DEFINITION_ERROR.SEARCH });
        }

        if (
            normalizedType !== undefined &&
            normalizedType !== "" &&
            !Object.values(ProductDefinitionType).includes(normalizedType as ProductDefinitionType)
        ) {
            return res.status(400).json({ message: PRODUCT_DEFINITION_ERROR.TYPE });
        }

        if (typeof search === "string") {
            search = search.trim();
            if (search.length === 0) search = undefined;
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: PRODUCT_DEFINITION_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: PRODUCT_DEFINITION_ERROR.SORT });
        }

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        req.query.search = search?.toString();
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = sortOrder?.toString() || "desc";
        req.query.includeInactive = includeInactive?.toLowerCase() === "true" ? "true" : "false";
        if (normalizedType) {
            req.query.type = normalizedType as ProductDefinitionType;
        }

        return next();
    };
}

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
