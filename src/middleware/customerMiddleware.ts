import { Request, Response, NextFunction } from "express";

export const validateCustomerPaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10", includeInactive } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: "page and limit must be numbers" });
    }

    if (
        includeInactive !== undefined &&
        includeInactive !== "true" &&
        includeInactive !== "false"
    ) {
        return res.status(400).json({ message: "includeInactive must be 'true' or 'false'" });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();
    req.query.includeInactive = includeInactive?.toLowerCase() === "true" ? "true" : "false";

    next();
};
