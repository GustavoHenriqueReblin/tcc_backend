import fs from "node:fs/promises";
import fsSync from "node:fs";
import { chromium } from "playwright";
import { AppError } from "@utils/appError";
import { handleError } from "@utils/errorBundler";
import { reportRegistry } from "./report.registry";
import type {
    ReportDefinition,
    ReportRegistry,
    ReportRequestContext,
    ReportTemplateConfig,
} from "./report.types";

const DEFAULT_PDF_OPTIONS = {
    format: "A4",
    printBackground: true,
} as const;

const SYSTEM_CHROMIUM_PATHS = ["/usr/bin/chromium", "/usr/bin/chromium-browser"];

export class ReportService {
    constructor(private readonly registry: ReportRegistry) {}

    hasReport(reportKey: string) {
        return Boolean(this.registry[reportKey]);
    }

    async generatePdf(reportKey: string, context: ReportRequestContext): Promise<Buffer> {
        const definition = this.registry[reportKey];
        if (!definition) {
            throw new AppError("Relatorio nao encontrado", 404, "REPORT:NOT_FOUND");
        }

        let browser;
        try {
            const html = await this.renderHtml(definition, context);
            const executablePath = SYSTEM_CHROMIUM_PATHS.find((path) => fsSync.existsSync(path));

            console.log("[REPORT][PDF] Chromium executablePath:", executablePath ?? "NOT_FOUND");

            browser = await chromium.launch({
                headless: true,
                executablePath,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
            });

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: "networkidle" });

            const pdfBuffer = await page.pdf({
                ...DEFAULT_PDF_OPTIONS,
                ...definition.pdfOptions,
            });

            return pdfBuffer;
        } catch (error) {
            await handleError(error, `REPORT:${reportKey}`);
            if (error instanceof AppError) throw error;

            throw new AppError(
                "Falha ao gerar relatorio em PDF",
                500,
                `REPORT:${reportKey}`,
                error
            );
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    private async renderHtml<TData>(
        definition: ReportDefinition<TData>,
        context: ReportRequestContext
    ) {
        const data = await definition.dataFetcher(context);
        const template = await this.loadTemplate(definition.template);

        if (definition.template.render) {
            return definition.template.render({ template, data });
        }

        if (this.isRecord(data)) {
            return this.fillTemplate(template, data);
        }

        return template;
    }

    private async loadTemplate<TData>(config: ReportTemplateConfig<TData>) {
        return fs.readFile(config.path, "utf-8");
    }

    private fillTemplate(template: string, data: Record<string, unknown>) {
        return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key: string) => {
            const value = key.split(".").reduce<unknown>((acc, part) => {
                if (acc && typeof acc === "object" && part in acc) {
                    return (acc as Record<string, unknown>)[part];
                }
                return undefined;
            }, data);

            return value !== undefined && value !== null ? String(value) : "";
        });
    }

    private isRecord(value: unknown): value is Record<string, unknown> {
        return Boolean(value) && typeof value === "object" && !Array.isArray(value);
    }
}

export const reportService = new ReportService(reportRegistry);
