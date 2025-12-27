import { ProductInput } from "@services/product.service";
import { Request, Response, NextFunction } from "express";
import { validateNestedPayload } from "@utils/nestedItems";

export const PRODUCT_ERROR = {
    ID: "Invalid Id parameter",
    PAGINATION: "page and limit must be numbers",
    INCLUDE_INACTIVE: "includeInactive must be 'true' or 'false'",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
    PRODUCT_DEFINITION_ID: "productDefinitionId must be a number",
};

export interface ProductQueryValidationOptions {
    allowSearch?: boolean;
    allowedSortFields?: string[];
}

export const validateProductQuery = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: PRODUCT_ERROR.ID });
    }

    next();
};

export function validateProductsQuery(options: ProductQueryValidationOptions = {}) {
    const { allowSearch = true, allowedSortFields = [] } = options;

    return (req: Request, res: Response, next: NextFunction) => {
        let {
            page = "1",
            limit = "10",
            search,
            sortBy,
            sortOrder,
            includeInactive,
            productDefinitionId,
        } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const productDefinitionIdNum =
            productDefinitionId !== undefined && productDefinitionId !== null
                ? Number(productDefinitionId)
                : undefined;

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

        if (
            productDefinitionId !== undefined &&
            (productDefinitionId === "" || Number.isNaN(productDefinitionIdNum!))
        ) {
            return res.status(400).json({ message: PRODUCT_ERROR.PRODUCT_DEFINITION_ID });
        }

        if (!allowSearch && search !== undefined) {
            return res.status(400).json({ message: PRODUCT_ERROR.SEARCH });
        }

        if (typeof search === "string") {
            search = search.trim();
            if (search.length === 0) search = undefined;
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: PRODUCT_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: PRODUCT_ERROR.SORT });
        }

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        req.query.search = search?.toString();
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = sortOrder?.toString() || "desc";
        req.query.includeInactive = includeInactive?.toLowerCase() === "true" ? "true" : "false";
        if (productDefinitionIdNum !== undefined) {
            req.query.productDefinitionId = productDefinitionIdNum.toString();
        }

        return next();
    };
}

export const validateProductFields = (req: Request, res: Response, next: NextFunction) => {
    const product = req.body as ProductInput;
    const inventory = product.inventory;

    if (!product || !inventory) {
        return res.status(400).json({ message: PRODUCT_ERROR.MISSING_FIELDS });
    }

    if (
        !product.name ||
        inventory.costValue === null ||
        inventory.costValue === undefined ||
        inventory.quantity === null ||
        inventory.quantity === undefined ||
        inventory.saleValue === null ||
        inventory.saleValue === undefined
    ) {
        return res.status(400).json({ message: PRODUCT_ERROR.MISSING_FIELDS });
    }

    if (product.recipes !== undefined) {
        const validation = validateNestedPayload("recipes", product.recipes);

        if (!validation.ok) {
            return res.status(400).json({ message: validation.message });
        }

        const recipes = product.recipes;

        [...(recipes.create ?? []), ...(recipes.update ?? [])].forEach((recipe, idx) => {
            if (recipe.items !== undefined) {
                const nestedItemsValidation = validateNestedPayload(
                    `recipes.${recipe.id ?? `create_${idx}`}.items`,
                    recipe.items
                );

                if (!nestedItemsValidation.ok) {
                    return res.status(400).json({ message: nestedItemsValidation.message });
                }
            }
        });
    }

    next();
};
