import { Router } from "express";
import { getAllUsers, createUser } from "@controllers/user.controller";
import { authMiddleware } from "@middleware/authMiddleware";
import { validateUsersQuery } from "@middleware/userMiddleware";

export const userPersonAllowedSortFields = ["name", "legalName", "taxId"];
export const userAllowedSortFields = ["username", "createdAt", "updatedAt"];

const router = Router();

router.get(
    "/",
    authMiddleware,
    validateUsersQuery({
        allowedSortFields: userPersonAllowedSortFields.concat(userAllowedSortFields),
    }),
    getAllUsers
);
router.post("/", authMiddleware, createUser);

export default router;
