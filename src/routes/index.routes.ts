import { Router } from "express";
import userRoutes from "@routes/user.routes";
import authRoutes from "@routes/auth.routes";
import customerRoutes from "@routes/customer.routes";
import deliveryAddress from "@routes/deliveryAddress.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/customers", customerRoutes);
router.use("/delivery-address", deliveryAddress);

export default router;
