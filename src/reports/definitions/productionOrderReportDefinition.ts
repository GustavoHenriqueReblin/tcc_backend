import path from "node:path";
import { ReportDefinition } from "@reports/report.types";
import { formatCurrency, formatDate, formatDecimal, toNumber } from "@reports/utils";
import { productionOrderService } from "@services/services";
import { AppError } from "@utils/appError";

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

const statusLabels: Record<string, string> = {
    PLANNED: "Planejada",
    RUNNING: "Em produção",
    FINISHED: "Finalizada",
    CANCELLED: "Cancelada",
};

const statusClasses: Record<string, string> = {
    PLANNED: "bg-gray-200 text-gray-800",
    RUNNING: "bg-blue-100 text-blue-800",
    FINISHED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
};

export const productionOrderReport: ReportDefinition<ProductionOrderReportData> = {
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
                producedQtyWithUnit: data.producedQty ? `${data.producedQty} ${data.unit}` : "",
                wasteQty: data.wasteQty ?? "",
                wasteQtyWithUnit: data.wasteQty ? `${data.wasteQty} ${data.unit}` : "",
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
