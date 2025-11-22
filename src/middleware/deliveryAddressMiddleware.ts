import { Status } from "@prisma/client";
import { DeliveryAddressInput } from "@services/deliveryAddress.service";
import { Request, Response, NextFunction } from "express";

export const DELIVERY_ADDRESS_ERROR = {
    ID: "Invalid Id parameter",
    PAGINATION: "page and limit must be numbers",
    INCLUDE_INACTIVE: "includeInactive must be 'true' or 'false'",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
};

export interface DeliveryAddressQueryValidationOptions {
    allowSearch?: boolean;
    allowedSortFields?: string[];
}

export const validateDeliveryAddressQuery = (
    options: DeliveryAddressQueryValidationOptions = {}
) => {
    const { allowSearch = true, allowedSortFields = [] } = options;

    return (req: Request, res: Response, next: NextFunction) => {
        let { page = "1", limit = "10", search, sortBy, sortOrder, includeInactive } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);

        if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
            return res.status(400).json({ message: DELIVERY_ADDRESS_ERROR.PAGINATION });
        }

        if (
            includeInactive !== undefined &&
            includeInactive !== "true" &&
            includeInactive !== "false"
        ) {
            return res.status(400).json({ message: DELIVERY_ADDRESS_ERROR.INCLUDE_INACTIVE });
        }

        if (!allowSearch && search !== undefined) {
            return res.status(400).json({ message: DELIVERY_ADDRESS_ERROR.SEARCH });
        }

        if (typeof search === "string") {
            search = search.trim();
            if (search.length === 0) search = undefined;
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: DELIVERY_ADDRESS_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: DELIVERY_ADDRESS_ERROR.SORT });
        }

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        req.query.search = search?.toString();
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = sortOrder?.toString() || "desc";
        req.query.includeInactive = includeInactive?.toLowerCase() === "true" ? "true" : "false";

        next();
    };
};

export const validateDeliveryAddressId = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: DELIVERY_ADDRESS_ERROR.ID });
    }

    next();
};

export const validateDeliveryAddressFields = (req: Request, res: Response, next: NextFunction) => {
    const deliveryAddress = req.body as DeliveryAddressInput;

    if (!deliveryAddress.customerId || !deliveryAddress.cityId || !deliveryAddress.stateId) {
        return res.status(400).json({ message: DELIVERY_ADDRESS_ERROR.MISSING_FIELDS });
    }

    if (deliveryAddress.status && !Object.values(Status).includes(deliveryAddress.status)) {
        return res.status(400).json({ message: DELIVERY_ADDRESS_ERROR.WRONG_FIELD_VALUE });
    }

    next();
};
