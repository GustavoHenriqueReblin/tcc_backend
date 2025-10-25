import { Router } from "express";
import { getAllUsers, createUser } from "@controllers/user.controller";
import { authMiddleware } from "@middleware/authMiddleware";

const router = Router();

router.get("/", authMiddleware, getAllUsers);
router.post("/", authMiddleware, createUser);

export default router;
