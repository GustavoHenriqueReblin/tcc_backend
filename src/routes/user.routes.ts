import { Router } from "express";
import { getAllUsers, createUser } from "@controllers/user.controller";
import { authMiddleware } from "@middleware/authMiddleware";
import { validateUsersQuery } from "@middleware/userMiddleware";

const router = Router();

router.get(
    "/",
    authMiddleware,
    validateUsersQuery({
        allowedSortFields: ["name", "legalName", "username", "createdAt", "updatedAt"],
    }),
    getAllUsers
);
router.post("/", authMiddleware, createUser);

export default router;
