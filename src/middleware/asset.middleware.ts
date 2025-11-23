import { AssetStatus } from "@prisma/client";
import { AssetInput } from "@services/asset.service";
import { Request, Response, NextFunction } from "express";

export const ASSET_ERROR = {
    ID: "Invalid Id parameter",
    PAGINATION: "page and limit must be numbers",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
};

export interface AssetListQueryOptions {
    allowedSortFields?: string[];
}

export const validateAssetQuery = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: ASSET_ERROR.ID });
    }

    next();
};

export const validateAssetListQuery =
    (options: AssetListQueryOptions = {}) =>
    (req: Request, res: Response, next: NextFunction) => {
        const { allowedSortFields = [] } = options;
        let { page = "1", limit = "10", search, sortBy, sortOrder } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);

        if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
            return res.status(400).json({ message: ASSET_ERROR.PAGINATION });
        }

        if (typeof search === "string") {
            search = search.trim();
            if (search.length === 0) search = undefined;
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: ASSET_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: ASSET_ERROR.SORT });
        }

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        req.query.search = search?.toString();
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = sortOrder?.toString() || "desc";

        next();
    };

export const validateAssetFields = (req: Request, res: Response, next: NextFunction) => {
    const asset = req.body as AssetInput;

    if (
        !asset ||
        !asset.name ||
        !asset.categoryId ||
        !asset.acquisitionDate ||
        asset.acquisitionCost === undefined ||
        asset.usefulLifeMonths === undefined ||
        asset.salvageValue === undefined
    ) {
        return res.status(400).json({ message: ASSET_ERROR.MISSING_FIELDS });
    }

    const acquisitionCost = Number(asset.acquisitionCost);
    const salvageValue = Number(asset.salvageValue);
    const usefulLifeMonths = Number(asset.usefulLifeMonths);
    const acquisitionDate = new Date(asset.acquisitionDate);

    if (
        Number.isNaN(acquisitionCost) ||
        Number.isNaN(salvageValue) ||
        Number.isNaN(usefulLifeMonths) ||
        Number.isNaN(acquisitionDate.getTime()) ||
        usefulLifeMonths <= 0 ||
        acquisitionCost < 0 ||
        salvageValue < 0
    ) {
        return res.status(400).json({ message: ASSET_ERROR.WRONG_FIELD_VALUE });
    }

    if (asset.status && !Object.values(AssetStatus).includes(asset.status as AssetStatus)) {
        return res.status(400).json({ message: ASSET_ERROR.WRONG_FIELD_VALUE });
    }

    next();
};
