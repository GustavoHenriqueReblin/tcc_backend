import { RecipeInput } from "@services/recipe.service";
import { Request, Response, NextFunction } from "express";

export const RECIPE_ERROR = {
    PAGINATION: "page and limit must be numbers",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
};

export const validateRecipePaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10" } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: RECIPE_ERROR.PAGINATION });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();

    next();
};

export const validateRecipeFields = (req: Request, res: Response, next: NextFunction) => {
    const recipe = req.body as RecipeInput;

    if (!recipe || !recipe.productId) {
        return res.status(400).json({ message: RECIPE_ERROR.MISSING_FIELDS });
    }

    next();
};
