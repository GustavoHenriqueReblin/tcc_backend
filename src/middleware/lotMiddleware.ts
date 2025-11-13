import { LotInput } from "@services/lot.service";
import { Request, Response, NextFunction } from "express";

export const LOT_ERROR = {
    PAGINATION: "page and limit must be numbers",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
};

export const validateLotPaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10" } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: LOT_ERROR.PAGINATION });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();

    next();
};

export const validateLotFields = (req: Request, res: Response, next: NextFunction) => {
    const lot = req.body as LotInput;

    if (!lot || !lot.code) {
        return res.status(400).json({ message: LOT_ERROR.MISSING_FIELDS });
    }

    next();
};

