import { AssetMaintenanceType } from "@prisma/client";
import { AssetMaintenanceInput } from "@services/assetMaintenance.service";
import { Request, Response, NextFunction } from "express";

export const ASSET_MAINTENANCE_ERROR = {
    PAGINATION: "page and limit must be numbers",
    INVALID_ASSET_ID: "assetId must be a number",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
};

export const validateAssetMaintenancePaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10", assetId } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: ASSET_MAINTENANCE_ERROR.PAGINATION });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();

    if (assetId !== undefined) {
        const assetIdNum = Number(assetId);
        if (Number.isNaN(assetIdNum)) {
            return res.status(400).json({ message: ASSET_MAINTENANCE_ERROR.INVALID_ASSET_ID });
        }
        req.query.assetId = assetIdNum.toString();
    }

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
