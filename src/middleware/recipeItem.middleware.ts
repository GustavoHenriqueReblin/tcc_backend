import { RecipeItemInput } from "@services/recipeItem.service";
import { Request, Response, NextFunction } from "express";

export const RECIPE_ITEM_ERROR = {
    ID: "Invalid Id parameter",
    PAGINATION: "page and limit must be numbers",
    INVALID_RECIPE: "recipeId must be a number",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
};

export interface RecipeItemListQueryOptions {
    allowedSortFields?: string[];
}

export const validateRecipeItemQuery = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: RECIPE_ITEM_ERROR.ID });
    }

    next();
};

export const validateRecipeItemListQuery =
    (options: RecipeItemListQueryOptions = {}) =>
    (req: Request, res: Response, next: NextFunction) => {
        const { allowedSortFields = [] } = options;

        let { page = "1", limit = "10", recipeId, search, sortBy, sortOrder } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const recipeNum = recipeId !== undefined ? Number(recipeId) : undefined;

        if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
            return res.status(400).json({ message: RECIPE_ITEM_ERROR.PAGINATION });
        }

        if (recipeId !== undefined && Number.isNaN(recipeNum)) {
            return res.status(400).json({ message: RECIPE_ITEM_ERROR.INVALID_RECIPE });
        }

        if (typeof search === "string") {
            search = search.trim();
            if (search.length === 0) search = undefined;
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: RECIPE_ITEM_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: RECIPE_ITEM_ERROR.SORT });
        }

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        if (recipeNum !== undefined) req.query.recipeId = recipeNum.toString();
        req.query.search = search?.toString();
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = sortOrder?.toString() || "desc";

        next();
    };

export const validateRecipeItemFields = (req: Request, res: Response, next: NextFunction) => {
    const item = req.body as RecipeItemInput;

    if (!item || !item.recipeId || !item.productId || item.quantity === undefined) {
        return res.status(400).json({ message: RECIPE_ITEM_ERROR.MISSING_FIELDS });
    }

    next();
};
