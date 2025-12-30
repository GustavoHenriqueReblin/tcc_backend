import { SaleOrderInput } from "@services/saleOrder.service";
import { isValidNestedItemsPayload } from "@middleware/nestedItems.middleware";
import { Request, Response, NextFunction } from "express";
import { OrderStatus } from "@prisma/client";

export const SALE_ORDER_ERROR = {
    ID: "Invalid Id parameter",
    PAGINATION: "page and limit must be numbers",
    INVALID_STATUS: "status must be a valid OrderStatus",
    INVALID_CUSTOMER: "customerId must be a number",
    INVALID_START_DATE: "startDateFrom and startDateTo must be valid dates",
    INVALID_END_DATE: "endDateFrom and endDateTo must be valid dates",
    INVALID_PERIOD_RANGE: "start/end date ranges are invalid",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
    ITEMS_STRUCTURE: "Invalid items payload",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
};

export interface SaleOrderListQueryOptions {
    allowedSortFields?: string[];
}

export const validateSaleOrderQuery = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: SALE_ORDER_ERROR.ID });
    }

    next();
};

export const validateSaleOrderListQuery =
    (options: SaleOrderListQueryOptions = {}) =>
    (req: Request, res: Response, next: NextFunction) => {
        const { allowedSortFields = [] } = options;
        let {
            page = "1",
            limit = "10",
            status,
            search,
            sortBy,
            sortOrder,
            customerId,
            startDateFrom,
            startDateTo,
            endDateFrom,
            endDateTo,
        } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const normalizedCustomerId =
            customerId !== undefined && customerId !== null
                ? customerId.toString().trim()
                : undefined;
        const customerIdNum =
            normalizedCustomerId !== undefined && normalizedCustomerId.length > 0
                ? Number(normalizedCustomerId)
                : undefined;

        if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
            return res.status(400).json({ message: SALE_ORDER_ERROR.PAGINATION });
        }

        if (
            normalizedCustomerId !== undefined &&
            normalizedCustomerId.length > 0 &&
            Number.isNaN(customerIdNum)
        ) {
            return res.status(400).json({ message: SALE_ORDER_ERROR.INVALID_CUSTOMER });
        }

        if (status && !Object.values(OrderStatus).includes(status as OrderStatus)) {
            return res.status(400).json({ message: SALE_ORDER_ERROR.INVALID_STATUS });
        }

        if (typeof search === "string") {
            search = search.trim();
            if (search.length === 0) search = undefined;
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
            return res.status(400).json({ message: SALE_ORDER_ERROR.INVALID_START_DATE });
        }

        const startDateToVal = parseDate(startDateTo);
        if (startDateToVal === null) {
            return res.status(400).json({ message: SALE_ORDER_ERROR.INVALID_START_DATE });
        }

        const endDateFromVal = parseDate(endDateFrom);
        if (endDateFromVal === null) {
            return res.status(400).json({ message: SALE_ORDER_ERROR.INVALID_END_DATE });
        }

        const endDateToVal = parseDate(endDateTo);
        if (endDateToVal === null) {
            return res.status(400).json({ message: SALE_ORDER_ERROR.INVALID_END_DATE });
        }

        if (
            (startDateFromVal && startDateToVal && startDateFromVal > startDateToVal) ||
            (endDateFromVal && endDateToVal && endDateFromVal > endDateToVal)
        ) {
            return res.status(400).json({ message: SALE_ORDER_ERROR.INVALID_PERIOD_RANGE });
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: SALE_ORDER_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: SALE_ORDER_ERROR.SORT });
        }

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        req.query.customerId = customerIdNum !== undefined ? customerIdNum.toString() : undefined;
        req.query.startDateFrom = startDateFromVal ? startDateFromVal.toISOString() : undefined;
        req.query.startDateTo = startDateToVal ? startDateToVal.toISOString() : undefined;
        req.query.endDateFrom = endDateFromVal ? endDateFromVal.toISOString() : undefined;
        req.query.endDateTo = endDateToVal ? endDateToVal.toISOString() : undefined;
        if (status) req.query.status = status as string;
        req.query.search = search?.toString();
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = sortOrder?.toString() || "desc";

        next();
    };

export const validateSaleOrderFields = (req: Request, res: Response, next: NextFunction) => {
    const order = req.body as SaleOrderInput;

    if (!order || !order.customerId || !order.code || order.totalValue === undefined) {
        return res.status(400).json({ message: SALE_ORDER_ERROR.MISSING_FIELDS });
    }

    const totalValueNum = Number(order.totalValue);
    const discountValue = order.discount !== undefined ? Number(order.discount) : 0;
    const otherCostsValue = order.otherCosts !== undefined ? Number(order.otherCosts) : 0;

    if (Number.isNaN(totalValueNum) || totalValueNum < 0) {
        return res.status(400).json({ message: SALE_ORDER_ERROR.WRONG_FIELD_VALUE });
    }

    const invalidDiscount =
        order.discount !== undefined && (Number.isNaN(discountValue) || discountValue < 0);
    const invalidOtherCosts =
        order.otherCosts !== undefined && (Number.isNaN(otherCostsValue) || otherCostsValue < 0);

    if (invalidDiscount || invalidOtherCosts) {
        return res.status(400).json({ message: SALE_ORDER_ERROR.WRONG_FIELD_VALUE });
    }

    if (order.status && !Object.values(OrderStatus).includes(order.status)) {
        return res.status(400).json({ message: SALE_ORDER_ERROR.WRONG_FIELD_VALUE });
    }

    if (order.status === OrderStatus.FINISHED && !order.warehouseId) {
        return res.status(400).json({ message: SALE_ORDER_ERROR.MISSING_FIELDS });
    }

    if (
        order.items &&
        !isValidNestedItemsPayload(order.items, {
            createRequiredFields: [
                "productId",
                "quantity",
                "unitPrice",
                "productUnitPrice",
                "unitCost",
            ],
            numericUpdateFields: [
                "productId",
                "quantity",
                "unitPrice",
                "productUnitPrice",
                "unitCost",
            ],
        })
    ) {
        return res.status(400).json({ message: SALE_ORDER_ERROR.ITEMS_STRUCTURE });
    }

    next();
};
