import path from "node:path";
import { prisma } from "@config/prisma";
import { OrderStatus } from "@prisma/client";
import { ReportDefinition } from "@reports/report.types";
import { formatCurrency, formatDate, formatDecimal, toNumber } from "@reports/utils";
import { AppError } from "@utils/appError";

interface SaleOrderReportData {
    id: string;
    code: string;
    status: string;
    statusClass: string;
    customerName: string;
    customerTaxId: string;
    createdAt: string;
    updatedAt: string;
    notes?: string;
    generatedAt: string;
    totals: {
        subtotal: string;
        discount: string;
        otherCosts: string;
        total: string;
    };
    items: Array<{
        name: string;
        quantity: string;
        unity: string;
        unitPrice: string;
        total: string;
    }>;
}

const saleStatusLabels: Record<OrderStatus, string> = {
    PENDING: "Pendente",
    APPROVED: "Aprovada",
    SHIPPED: "Enviada",
    RECEIVED: "Recebida",
    FINISHED: "Concluída",
    CANCELED: "Cancelada",
};

const saleStatusClasses: Record<OrderStatus, string> = {
    PENDING: "bg-gray-200 text-gray-800",
    APPROVED: "bg-blue-100 text-blue-800",
    SHIPPED: "bg-blue-100 text-blue-800",
    RECEIVED: "bg-green-100 text-green-800",
    FINISHED: "bg-green-100 text-green-800",
    CANCELED: "bg-red-100 text-red-800",
};

export const saleOrderReport: ReportDefinition<SaleOrderReportData> = {
    key: "sale-order",
    dataFetcher: async ({ id, enterpriseId }) => {
        const orderId = Number(id);
        const sale = await prisma.saleOrder.findUnique({
            where: { id: orderId, enterpriseId },
            include: {
                customer: { include: { person: true } },
                items: { include: { product: { include: { unity: true } } } },
            },
        });

        if (!sale) {
            throw new AppError("Pedido de venda nao encontrado", 404, "REPORT:SALE_ORDER");
        }

        const items = sale.items.map((item) => {
            const qty = toNumber(item.quantity);
            const unitPrice = toNumber(item.unitPrice);
            const total = qty * unitPrice;

            return {
                name: item.product?.name ?? `ID ${item.productId}`,
                quantity: formatDecimal(qty),
                unity: item.product?.unity?.simbol ?? item.product?.unity?.description ?? "-",
                unitPrice: formatCurrency(unitPrice),
                total: formatCurrency(total),
            };
        });

        const subtotal = sale.items.reduce(
            (acc, item) => acc + toNumber(item.quantity) * toNumber(item.unitPrice),
            0
        );

        return {
            id: String(sale.id),
            code: sale.code,
            status: saleStatusLabels[sale.status] ?? sale.status,
            statusClass: saleStatusClasses[sale.status] ?? saleStatusClasses[OrderStatus.PENDING],
            customerName:
                sale.customer?.person?.name ??
                sale.customer?.person?.legalName ??
                `Cliente ${sale.customerId}`,
            customerTaxId: sale.customer?.person?.taxId ?? "-",
            createdAt: formatDate(sale.createdAt),
            updatedAt: formatDate(sale.updatedAt),
            notes: sale.notes ?? undefined,
            generatedAt: formatDate(new Date()),
            items,
            totals: {
                subtotal: formatCurrency(subtotal),
                discount: formatCurrency(sale.discount ?? 0),
                otherCosts: formatCurrency(sale.otherCosts ?? 0),
                total: formatCurrency(sale.totalValue),
            },
        };
    },
    template: {
        path: path.resolve(process.cwd(), "src", "reports", "templates", "sale-order.html"),
        render: ({ template, data }) => {
            const itemsRows = data.items
                .map(
                    (item) =>
                        `<tr><td>${item.name}</td><td>${item.quantity} ${item.unity}</td><td>${item.unitPrice}</td><td>${item.total}</td></tr>`
                )
                .join("");

            const replacements: Record<string, string> = {
                code: data.code,
                status: data.status,
                statusClass: data.statusClass,
                customerName: data.customerName,
                customerTaxId: data.customerTaxId,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                notes: data.notes ?? "",
                generatedAt: data.generatedAt,
                itemsRows,
                subtotal: data.totals.subtotal,
                discount: data.totals.discount,
                otherCosts: data.totals.otherCosts,
                total: data.totals.total,
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
