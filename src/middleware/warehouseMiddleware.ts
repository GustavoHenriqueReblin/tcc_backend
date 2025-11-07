import { Request, Response, NextFunction } from "express";

export const WAREHOUSE_ERROR = {
    PAGINATION: "page and limit must be numbers",
};

export const validateWarehousePagination = (req: Request, res: Response, next: NextFunction) => {
    const { page = "1", limit = "10" } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: WAREHOUSE_ERROR.PAGINATION });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();

    next();
};
