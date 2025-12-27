import { RecipeInput } from "@services/recipe.service";
import { isValidNestedItemsPayload } from "@middleware/nestedItems.middleware";
import { Request, Response, NextFunction } from "express";

export const RECIPE_ERROR = {
    ID: "Invalid Id parameter",
    PAGINATION: "page and limit must be numbers",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
    ITEMS_STRUCTURE: "Invalid items payload",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
};

export interface RecipeListQueryOptions {
    allowedSortFields?: string[];
}

export const validateRecipeQuery = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: RECIPE_ERROR.ID });
    }

    next();
};

export const validateRecipeListQuery =
    (options: RecipeListQueryOptions = {}) =>
    (req: Request, res: Response, next: NextFunction) => {
        const { allowedSortFields = [] } = options;
        let { page = "1", limit = "10", search, sortBy, sortOrder } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);

        if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
            return res.status(400).json({ message: RECIPE_ERROR.PAGINATION });
        }

        if (typeof search === "string") {
            search = search.trim();
            if (search.length === 0) search = undefined;
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: RECIPE_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: RECIPE_ERROR.SORT });
        }

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        req.query.search = search?.toString();
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = sortOrder?.toString() || "desc";

        next();
    };

export const validateRecipeFields = (req: Request, res: Response, next: NextFunction) => {
    const recipe = req.body as RecipeInput;

    if (!recipe || !recipe.productId) {
        return res.status(400).json({ message: RECIPE_ERROR.MISSING_FIELDS });
    }

    if (
        recipe.items &&
        !isValidNestedItemsPayload(recipe.items, {
            createRequiredFields: ["productId", "quantity"],
        })
    ) {
        return res.status(400).json({ message: RECIPE_ERROR.ITEMS_STRUCTURE });
    }

    next();
};
