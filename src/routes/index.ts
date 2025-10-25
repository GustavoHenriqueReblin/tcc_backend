import { Router } from "express";
import userRoutes from "@routes/user.routes";

const routes = Router();

routes.use("/users", userRoutes);

export default routes;