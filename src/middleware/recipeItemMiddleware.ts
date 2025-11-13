import { RecipeItemInput } from "@services/recipeItem.service";
import { Request, Response, NextFunction } from "express";

export const RECIPE_ITEM_ERROR = {
    PAGINATION: "page and limit must be numbers",
    INVALID_RECIPE: "recipeId must be a number",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
};

export const validateRecipeItemPaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10", recipeId } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const recipeNum = recipeId !== undefined ? Number(recipeId) : undefined;

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: RECIPE_ITEM_ERROR.PAGINATION });
    }

    if (recipeId !== undefined && Number.isNaN(recipeNum)) {
        return res.status(400).json({ message: RECIPE_ITEM_ERROR.INVALID_RECIPE });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();
    if (recipeNum !== undefined) req.query.recipeId = recipeNum.toString();

    next();
};

export const validateRecipeItemFields = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const item = req.body as RecipeItemInput;

    if (!item || !item.recipeId || !item.productId || item.quantity === undefined) {
        return res.status(400).json({ message: RECIPE_ITEM_ERROR.MISSING_FIELDS });
    }

    next();
};

