import { AssetCategoryInput } from "@services/assetCategory.service";
import { Request, Response, NextFunction } from "express";

export const ASSET_CATEGORY_ERROR = {
    PAGINATION: "page and limit must be numbers",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
};

export const validateAssetCategoryPaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10" } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: ASSET_CATEGORY_ERROR.PAGINATION });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();

    next();
};

export const validateAssetCategoryFields = (req: Request, res: Response, next: NextFunction) => {
    const category = req.body as AssetCategoryInput;

    if (!category || !category.name) {
        return res.status(400).json({ message: ASSET_CATEGORY_ERROR.MISSING_FIELDS });
    }

    next();
};
