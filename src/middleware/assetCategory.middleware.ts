import { AssetCategoryInput } from "@services/assetCategory.service";
import { Request, Response, NextFunction } from "express";

export const ASSET_CATEGORY_ERROR = {
    ID: "Invalid Id parameter",
    PAGINATION: "page and limit must be numbers",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
};

export interface AssetCategoryListQueryOptions {
    allowedSortFields?: string[];
}

export const validateAssetCategoryQuery = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: ASSET_CATEGORY_ERROR.ID });
    }

    next();
};

export const validateAssetCategoryListQuery =
    (options: AssetCategoryListQueryOptions = {}) =>
    (req: Request, res: Response, next: NextFunction) => {
        const { allowedSortFields = [] } = options;
        let { page = "1", limit = "10", search, sortBy, sortOrder } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);

        if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
            return res.status(400).json({ message: ASSET_CATEGORY_ERROR.PAGINATION });
        }

        if (typeof search === "string") {
            search = search.trim();
            if (search.length === 0) search = undefined;
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: ASSET_CATEGORY_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: ASSET_CATEGORY_ERROR.SORT });
        }

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        req.query.search = search?.toString();
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = sortOrder?.toString() || "desc";

        next();
    };

export const validateAssetCategoryFields = (req: Request, res: Response, next: NextFunction) => {
    const category = req.body as AssetCategoryInput;

    if (!category || !category.name) {
        return res.status(400).json({ message: ASSET_CATEGORY_ERROR.MISSING_FIELDS });
    }

    next();
};
