import path from "node:path";
import { AppError } from "@utils/appError";
import { productionOrderService } from "@services/services";
import type { ReportDefinition, ReportRegistry } from "./report.types";

interface ProductionOrderReportData {
    id: string;
    code: string;
    productName: string;
    status: string;
    statusClass: string;
    plannedQty: string;
    producedQty: string | undefined;
    wasteQty: string | undefined;
    unit: string;
    startDate: string;
    endDate: string;
    notes?: string;
    generatedAt: string;
    totals: {
        inputCost: string;
        otherCosts: string;
        productionCost: string;
        inputQuantity: string;
    };
    inputs: Array<{
        name: string;
        quantity: string;
        unity: string;
        cost: string;
        totalCost: string;
    }>;
}

const formatDate = (value: Date | string | null | undefined) =>
    value ? new Date(value).toLocaleString("pt-BR") : "-";

const toNumber = (value: unknown): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value.replace(",", ".")) || 0;
    // Prisma Decimal has toNumber
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (value as any).toNumber === "function") return (value as any).toNumber();
    return Number(value) || 0;
};

const formatDecimal = (value: unknown, fractionDigits = 3) => {
    const num = toNumber(value);
    return num.toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: fractionDigits,
    });
};

const formatCurrency = (value: unknown) =>
    toNumber(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusLabels: Record<string, string> = {
    PLANNED: "Planejada",
    IN_PROGRESS: "Em andamento",
    FINISHED: "Finalizada",
    CANCELLED: "Cancelada",
};

const statusClasses: Record<string, string> = {
    PLANNED: "bg-gray-200 text-gray-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    FINISHED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
};

const productionOrderReport: ReportDefinition<ProductionOrderReportData> = {
    key: "production-order",
    dataFetcher: async ({ id, enterpriseId }) => {
        const orderId = Number(id);
        const order = await productionOrderService.getById(orderId, enterpriseId);

        if (!order) {
            throw new AppError("Ordem de producao nao encontrada", 404, "REPORT:PRODUCTION_ORDER");
        }

        const producedQty = toNumber(order.producedQty ?? order.plannedQty);

        return {
            id: String(order.id),
            code: order.code,
            productName: order.recipe?.product?.name ?? "-",
            status: statusLabels[order.status] ?? order.status,
            statusClass: statusClasses[order.status] ?? statusClasses.PLANNED,
            plannedQty: formatDecimal(order.plannedQty),
            producedQty: order.producedQty ? formatDecimal(order.producedQty) : undefined,
            wasteQty: order.wasteQty ? formatDecimal(order.wasteQty) : undefined,
            unit:
                order.recipe?.product?.unity?.simbol ??
                order.recipe?.product?.unity?.description ??
                "-",
            startDate: formatDate(order.startDate),
            endDate: formatDate(order.endDate),
            notes: order.notes ?? undefined,
            generatedAt: formatDate(new Date()),
            inputs:
                order.inputs?.map((input) => ({
                    name: input.product?.name ?? `ID ${input.productId}`,
                    quantity: formatDecimal(toNumber(input.quantity) * producedQty),
                    unity: input.product?.unity?.simbol ?? input.product?.unity?.description ?? "-",
                    cost: formatCurrency(input.unitCost),
                    totalCost: formatCurrency(
                        toNumber(input.quantity) * producedQty * toNumber(input.unitCost)
                    ),
                })) ?? [],
            totals: (() => {
                const inputCost = (order.inputs ?? []).reduce(
                    (acc, input) =>
                        acc + toNumber(input.quantity) * producedQty * toNumber(input.unitCost),
                    0
                );
                const otherCosts = toNumber(order.otherCosts);
                const productionCost = inputCost + otherCosts;
                const inputQuantity = (order.inputs ?? []).reduce(
                    (acc, input) => acc + toNumber(input.quantity) * producedQty,
                    0
                );

                return {
                    inputCost: formatCurrency(inputCost),
                    otherCosts: formatCurrency(otherCosts),
                    productionCost: formatCurrency(productionCost),
                    inputQuantity: formatDecimal(inputQuantity),
                };
            })(),
        };
    },
    template: {
        path: path.resolve(process.cwd(), "src", "reports", "templates", "production-order.html"),
        render: ({ template, data }) => {
            const inputsRows = data.inputs
                .map(
                    (input) =>
                        `<tr><td>${input.name}</td><td>${input.quantity} ${input.unity}</td><td>${input.cost}</td><td>${input.totalCost}</td></tr>`
                )
                .join("");

            const replacements: Record<string, string> = {
                id: data.id,
                code: data.code,
                productName: data.productName,
                status: data.status,
                statusClass: data.statusClass,
                plannedQty: data.plannedQty,
                producedQty: data.producedQty ?? "",
                wasteQty: data.wasteQty ?? "",
                unit: data.unit,
                startDate: data.startDate,
                endDate: data.endDate,
                notes: data.notes ?? "",
                generatedAt: data.generatedAt,
                inputsRows,
                inputCostTotal: data.totals.inputCost,
                otherCostsTotal: data.totals.otherCosts,
                productionCostTotal: data.totals.productionCost,
                inputQuantityTotal: data.totals.inputQuantity,
            };

            return Object.entries(replacements).reduce(
                (html, [key, value]) =>
                    html.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), value ?? ""),
                template
            );
        },
    },
    pdfOptions: {
        format: "A4",
        printBackground: true,
    },
};

export const reportRegistry: ReportRegistry = {
    [productionOrderReport.key]: productionOrderReport as ReportDefinition<unknown>,
};
