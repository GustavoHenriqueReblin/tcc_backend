import { Status } from "@prisma/client";
import { DeliveryAddressInput } from "@services/deliveryAddress.service";
import { Request, Response, NextFunction } from "express";

export const DELIVERY_ADDRESS_ERROR = {
    PAGINATION: "page and limit must be numbers",
    INCLUDE_INACTIVE: "includeInactive must be 'true' or 'false'",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
};

export const validateDeliveryAddressPaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10", includeInactive } = req.query;

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

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();
    req.query.includeInactive = includeInactive?.toLowerCase() === "true" ? "true" : "false";

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
