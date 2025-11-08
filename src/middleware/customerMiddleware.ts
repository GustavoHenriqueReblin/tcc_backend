import { MaritalStatus, PersonType, Status } from "@prisma/client";
import { CustomerInput } from "@services/customer.service";
import { Request, Response, NextFunction } from "express";

export const CUSTOMER_ERROR = {
    PAGINATION: "page and limit must be numbers",
    INCLUDE_INACTIVE: "includeInactive must be 'true' or 'false'",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
};

export const validateCustomerPaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10", includeInactive } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: CUSTOMER_ERROR.PAGINATION });
    }

    if (
        includeInactive !== undefined &&
        includeInactive !== "true" &&
        includeInactive !== "false"
    ) {
        return res.status(400).json({ message: CUSTOMER_ERROR.INCLUDE_INACTIVE });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();
    req.query.includeInactive = includeInactive?.toLowerCase() === "true" ? "true" : "false";

    next();
};

export const validateCustomerFields = (req: Request, res: Response, next: NextFunction) => {
    const customer = req.body as CustomerInput;
    const person = customer.person;

    if (!customer || !person) {
        return res.status(400).json({ message: CUSTOMER_ERROR.MISSING_FIELDS });
    }

    if (!person.name) {
        return res.status(400).json({ message: CUSTOMER_ERROR.MISSING_FIELDS });
    }

    if (!person.taxId) {
        return res.status(400).json({ message: CUSTOMER_ERROR.MISSING_FIELDS });
    }

    if (person.maritalStatus && !Object.values(MaritalStatus).includes(person.maritalStatus)) {
        return res.status(400).json({ message: CUSTOMER_ERROR.WRONG_FIELD_VALUE });
    }

    if (customer.type && !Object.values(PersonType).includes(customer.type)) {
        return res.status(400).json({ message: CUSTOMER_ERROR.WRONG_FIELD_VALUE });
    }

    if (customer.status && !Object.values(Status).includes(customer.status)) {
        return res.status(400).json({ message: CUSTOMER_ERROR.WRONG_FIELD_VALUE });
    }

    next();
};
