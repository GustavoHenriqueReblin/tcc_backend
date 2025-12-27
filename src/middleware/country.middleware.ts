import type { Request, Response, NextFunction } from "express";

export const COUNTRY_ERROR = {
    PAGINATION: "page and limit must be numbers greater than zero",
    SORT_ORDER: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
};

export const validateCountryListQuery =
    (allowedSortFields: string[]) => (req: Request, res: Response, next: NextFunction) => {
        let { page = "1", limit = "50", search, sortBy, sortOrder } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);

        if (Number.isNaN(pageNum) || Number.isNaN(limitNum) || pageNum <= 0 || limitNum <= 0) {
            return res.status(400).json({ message: COUNTRY_ERROR.PAGINATION });
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: COUNTRY_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: COUNTRY_ERROR.SORT_ORDER });
        }

        const normalizedSearch =
            typeof search === "string" && search.trim().length > 0 ? search.trim() : undefined;

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        req.query.search = normalizedSearch;
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = (sortOrder?.toString() || "asc") as "asc" | "desc";

        return next();
    };
