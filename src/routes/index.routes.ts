import { Router } from "express";
import userRoutes from "@routes/user.routes";
import authRoutes from "@routes/auth.routes";
import customerRoutes from "@routes/customer.routes";
import deliveryAddress from "@routes/deliveryAddress.routes";
import productRoutes from "@routes/product.routes";
import unityRoutes from "@routes/unity.routes";
import productDefinitionRoutes from "@routes/productDefinition.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/customers", customerRoutes);
router.use("/delivery-address", deliveryAddress);
router.use("/products", productRoutes);
router.use("/unities", unityRoutes);
router.use("/product-definitions", productDefinitionRoutes);

export default router;
