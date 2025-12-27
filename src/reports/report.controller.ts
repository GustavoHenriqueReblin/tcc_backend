import type { Response } from "express";
import { Request } from "@middleware/auth.middleware";
import { AppError } from "@utils/appError";
import { reportService } from "./report.service";

export const getReportPdf = async (req: Request, res: Response) => {
    const { reportKey, id } = req.params;
    const enterpriseId = req.auth?.enterpriseId;

    if (!enterpriseId) {
        throw new AppError(
            "Empresa não informada na requisição",
            401,
            "REPORT:ENTERPRISE_REQUIRED"
        );
    }

    if (!reportService.hasReport(reportKey)) {
        throw new AppError("Tipo de relatorio não encontrado", 404, "REPORT:INVALID_KEY");
    }

    const pdfBuffer = await reportService.generatePdf(reportKey, { id, enterpriseId });

    const filename = encodeURIComponent(`Ordem de Produção ${id}.pdf`);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `inline; filename="${filename}"; filename*=UTF-8''${filename}`
    );

    return res.send(pdfBuffer);
};
