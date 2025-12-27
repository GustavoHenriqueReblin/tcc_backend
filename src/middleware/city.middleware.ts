import type { Request, Response, NextFunction } from "express";

export const CITY_ERROR = {
    STATE_ID: "stateId must be provided as a valid number",
    COUNTRY_ID: "countryId must be a valid number when provided",
    PAGINATION: "page and limit must be numbers greater than zero",
    SORT_ORDER: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
};

export const validateCityListQuery =
    (allowedSortFields: string[]) => (req: Request, res: Response, next: NextFunction) => {
        let {
            page = "1",
            limit = "100",
            search,
            sortBy,
            sortOrder,
            stateId,
            countryId,
        } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const stateIdNum = Number(stateId);
        const countryIdNum =
            countryId !== undefined && countryId !== "" ? Number(countryId) : undefined;

        if (!stateId || Number.isNaN(stateIdNum)) {
            return res.status(400).json({ message: CITY_ERROR.STATE_ID });
        }

        if (countryId !== undefined && (countryId === "" || Number.isNaN(countryIdNum!))) {
            return res.status(400).json({ message: CITY_ERROR.COUNTRY_ID });
        }

        if (Number.isNaN(pageNum) || Number.isNaN(limitNum) || pageNum <= 0 || limitNum <= 0) {
            return res.status(400).json({ message: CITY_ERROR.PAGINATION });
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: CITY_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: CITY_ERROR.SORT_ORDER });
        }

        const normalizedSearch =
            typeof search === "string" && search.trim().length > 0 ? search.trim() : undefined;

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        req.query.search = normalizedSearch;
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = (sortOrder?.toString() || "asc") as "asc" | "desc";
        req.query.stateId = stateIdNum.toString();

        if (countryIdNum !== undefined) {
            req.query.countryId = countryIdNum.toString();
        }

        return next();
    };
