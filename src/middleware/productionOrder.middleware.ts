import { ProductionOrderPayload } from "@services/productionOrder.service";
import { Request, Response, NextFunction } from "express";
import { ProductionOrderStatus } from "@prisma/client";

export const PRODUCTION_ORDER_ERROR = {
    ID: "Invalid Id parameter",
    PAGINATION: "page and limit must be numbers",
    INVALID_STATUS: "status must be a valid ProductionOrderStatus",
    INVALID_PRODUCT: "productId must be a number",
    INVALID_START_DATE: "startDateFrom and startDateTo must be valid dates",
    INVALID_END_DATE: "endDateFrom and endDateTo must be valid dates",
    INVALID_PERIOD_RANGE: "start/end date ranges are invalid",
    INVALID_START_END_DATE: "startDate and endDate must be valid dates",
    END_DATE_BEFORE_START: "endDate must be greater than startDate",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
};

export interface ProductionOrderListQueryOptions {
    allowSearch?: boolean;
    allowedSortFields?: string[];
}

export const validateProductionOrderQuery = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.ID });
    }

    next();
};

export const validateProductionOrderListQuery =
    (options: ProductionOrderListQueryOptions = {}) =>
    (req: Request, res: Response, next: NextFunction) => {
        const { allowSearch = true, allowedSortFields = [] } = options;

        let {
            page = "1",
            limit = "10",
            search,
            sortBy,
            sortOrder,
            status,
            productId,
            startDateFrom,
            startDateTo,
            endDateFrom,
            endDateTo,
        } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const normalizedProductId =
            productId !== undefined && productId !== null ? productId.toString().trim() : undefined;
        const productIdNum =
            normalizedProductId !== undefined && normalizedProductId.length > 0
                ? Number(normalizedProductId)
                : undefined;

        if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
            return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.PAGINATION });
        }

        if (!allowSearch && search !== undefined) {
            return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.SEARCH });
        }

        if (typeof search === "string") {
            search = search.trim();
            if (search.length === 0) search = undefined;
        }

        if (
            normalizedProductId !== undefined &&
            normalizedProductId.length > 0 &&
            Number.isNaN(productIdNum)
        ) {
            return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.INVALID_PRODUCT });
        }

        const parseDate = (value?: unknown) => {
            if (value === undefined || value === null) return undefined;
            const parsed = value.toString().trim();
            if (parsed.length === 0) return undefined;

            const dateVal = new Date(parsed);
            if (Number.isNaN(dateVal.getTime())) return null;
            return dateVal;
        };

        const startDateFromVal = parseDate(startDateFrom);
        if (startDateFromVal === null) {
            return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.INVALID_START_DATE });
        }

        const startDateToVal = parseDate(startDateTo);
        if (startDateToVal === null) {
            return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.INVALID_START_DATE });
        }

        const endDateFromVal = parseDate(endDateFrom);
        if (endDateFromVal === null) {
            return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.INVALID_END_DATE });
        }

        const endDateToVal = parseDate(endDateTo);
        if (endDateToVal === null) {
            return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.INVALID_END_DATE });
        }

        if (
            (startDateFromVal && startDateToVal && startDateFromVal > startDateToVal) ||
            (endDateFromVal && endDateToVal && endDateFromVal > endDateToVal)
        ) {
            return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.INVALID_PERIOD_RANGE });
        }

        if (
            status &&
            !Object.values(ProductionOrderStatus).includes(status as ProductionOrderStatus)
        ) {
            return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.INVALID_STATUS });
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.SORT });
        }

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        req.query.productId = productIdNum !== undefined ? productIdNum.toString() : undefined;
        req.query.startDateFrom = startDateFromVal ? startDateFromVal.toISOString() : undefined;
        req.query.startDateTo = startDateToVal ? startDateToVal.toISOString() : undefined;
        req.query.endDateFrom = endDateFromVal ? endDateFromVal.toISOString() : undefined;
        req.query.endDateTo = endDateToVal ? endDateToVal.toISOString() : undefined;
        req.query.search = search?.toString();
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = sortOrder?.toString() || "desc";
        if (status) req.query.status = status as string;

        return next();
    };

export const validateProductionOrderFields = (req: Request, res: Response, next: NextFunction) => {
    const order = req.body as ProductionOrderPayload;

    if (
        !order ||
        !order.code ||
        !order.recipeId ||
        !order.warehouseId ||
        order.plannedQty === undefined
    ) {
        return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.MISSING_FIELDS });
    }

    const otherCostsValue = Number(order.otherCosts);
    const invalidOtherCosts =
        order.otherCosts !== undefined &&
        order.otherCosts !== null &&
        (Number.isNaN(otherCostsValue) || otherCostsValue < 0);

    if (invalidOtherCosts) {
        return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.WRONG_FIELD_VALUE });
    }

    const parseDate = (value?: unknown) => {
        if (value === undefined || value === null) return undefined;
        const normalized = typeof value === "string" ? value.trim() : value;
        if (typeof normalized === "string" && normalized.length === 0) return undefined;

        const parsed = new Date(normalized as string | number | Date);
        if (Number.isNaN(parsed.getTime())) return null;
        return parsed;
    };

    const startDateVal = parseDate(order.startDate);
    const endDateVal = parseDate(order.endDate);

    if (startDateVal === null || endDateVal === null) {
        return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.INVALID_START_END_DATE });
    }

    if (startDateVal && endDateVal && endDateVal <= startDateVal) {
        return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.END_DATE_BEFORE_START });
    }

    if (order.status && !Object.values(ProductionOrderStatus).includes(order.status)) {
        return res.status(400).json({ message: PRODUCTION_ORDER_ERROR.WRONG_FIELD_VALUE });
    }

    next();
};
