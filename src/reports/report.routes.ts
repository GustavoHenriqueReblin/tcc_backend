import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import { getReportPdf } from "./report.controller";

const router = Router();

router.use(authMiddleware);
router.get("/:reportKey/:id/pdf", getReportPdf);

export default router;
