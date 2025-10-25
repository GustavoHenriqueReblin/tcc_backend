import { Router } from "express";
import userRoutes from "@routes/user.routes";
import authRoutes from "@routes/auth.routes";

const routes = Router();

routes.use("/users", userRoutes);
routes.use("/auth", authRoutes);

export default routes;
