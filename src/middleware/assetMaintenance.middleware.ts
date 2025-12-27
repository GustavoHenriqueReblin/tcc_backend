import { AssetMaintenanceType } from "@prisma/client";
import { AssetMaintenanceInput } from "@services/assetMaintenance.service";
import { Request, Response, NextFunction } from "express";

export const ASSET_MAINTENANCE_ERROR = {
    ID: "Invalid Id parameter",
    PAGINATION: "page and limit must be numbers",
    INVALID_ASSET_ID: "assetId must be a number",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
};

export interface AssetMaintenanceListQueryOptions {
    allowedSortFields?: string[];
}

export const validateAssetMaintenanceQuery = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: ASSET_MAINTENANCE_ERROR.ID });
    }

    next();
};

export const validateAssetMaintenanceListQuery =
    (options: AssetMaintenanceListQueryOptions = {}) =>
    (req: Request, res: Response, next: NextFunction) => {
        const { allowedSortFields = [] } = options;

        let { page = "1", limit = "10", assetId, search, sortBy, sortOrder } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);

        if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
            return res.status(400).json({ message: ASSET_MAINTENANCE_ERROR.PAGINATION });
        }

        let assetIdNum: number | undefined;
        if (assetId !== undefined) {
            assetIdNum = Number(assetId);
            if (Number.isNaN(assetIdNum)) {
                return res.status(400).json({ message: ASSET_MAINTENANCE_ERROR.INVALID_ASSET_ID });
            }
        }

        if (typeof search === "string") {
            search = search.trim();
            if (search.length === 0) search = undefined;
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: ASSET_MAINTENANCE_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: ASSET_MAINTENANCE_ERROR.SORT });
        }

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        if (assetIdNum !== undefined) req.query.assetId = assetIdNum.toString();
        req.query.search = search?.toString();
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = sortOrder?.toString() || "desc";

        next();
    };

export const validateAssetMaintenanceFields = (req: Request, res: Response, next: NextFunction) => {
    const maintenance = req.body as AssetMaintenanceInput;

    if (!maintenance || !maintenance.assetId || !maintenance.date) {
        return res.status(400).json({ message: ASSET_MAINTENANCE_ERROR.MISSING_FIELDS });
    }

    const costNum =
        maintenance.cost !== undefined && maintenance.cost !== null
            ? Number(maintenance.cost)
            : null;
    const dateVal = new Date(maintenance.date);

    if ((costNum !== null && Number.isNaN(costNum)) || Number.isNaN(dateVal.getTime())) {
        return res.status(400).json({ message: ASSET_MAINTENANCE_ERROR.WRONG_FIELD_VALUE });
    }

    if (
        maintenance.type &&
        !Object.values(AssetMaintenanceType).includes(maintenance.type as AssetMaintenanceType)
    ) {
        return res.status(400).json({ message: ASSET_MAINTENANCE_ERROR.WRONG_FIELD_VALUE });
    }

    next();
};
