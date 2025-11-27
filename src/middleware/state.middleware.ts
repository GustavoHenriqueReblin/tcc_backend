import type { Request, Response, NextFunction } from "express";

export const STATE_ERROR = {
    COUNTRY_ID: "countryId must be provided as a valid number",
    PAGINATION: "page and limit must be numbers greater than zero",
    SORT_ORDER: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
};

export const validateStateListQuery =
    (allowedSortFields: string[]) => (req: Request, res: Response, next: NextFunction) => {
        let { page = "1", limit = "100", search, sortBy, sortOrder, countryId } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const countryIdNum = Number(countryId);

        if (!countryId || Number.isNaN(countryIdNum)) {
            return res.status(400).json({ message: STATE_ERROR.COUNTRY_ID });
        }

        if (Number.isNaN(pageNum) || Number.isNaN(limitNum) || pageNum <= 0 || limitNum <= 0) {
            return res.status(400).json({ message: STATE_ERROR.PAGINATION });
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: STATE_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: STATE_ERROR.SORT_ORDER });
        }

        const normalizedSearch =
            typeof search === "string" && search.trim().length > 0 ? search.trim() : undefined;

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        req.query.search = normalizedSearch;
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = (sortOrder?.toString() || "asc") as "asc" | "desc";
        req.query.countryId = countryIdNum.toString();

        return next();
    };
