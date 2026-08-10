import path from "node:path";
import { prisma } from "@config/prisma";
import { OrderStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { ReportDefinition } from "@reports/report.types";
import {
    formatCurrency,
    formatDate,
    formatDateOnly,
    formatDecimal,
    toNumber,
} from "@reports/utils";

interface SaleOrderListReportData {
    generatedAt: string;
    rangeLabel: string;
    appliedFilters: Array<{ label: string; value: string }>;
    orders: Array<{
        code: string;
        customerName: string;
        status: string;
        statusClass: string;
        createdAt: string;
        total: string;
        items: Array<{
            name: string;
            quantity: string;
            unity: string;
            unitPrice: string;
            total: string;
        }>;
    }>;
    totals: {
        subtotal: string;
        discount: string;
        otherCosts: string;
        total: string;
    };
    ordersCount: number;
    totalItemsQuantity: string;
}

const saleStatusLabels: Record<OrderStatus, string> = {
    PENDING: "Pendente",
    APPROVED: "Aprovada",
    SHIPPED: "Enviada",
    RECEIVED: "Recebida",
    FINISHED: "Finalizada",
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

export const saleOrderListReport: ReportDefinition<SaleOrderListReportData> = {
    key: "sale-order-list",
    dataFetcher: async ({ enterpriseId, timeZone, filters }) => {
        const where: Prisma.SaleOrderWhereInput = { enterpriseId };

        const createdAtFrom = filters?.createdAtFrom;
        const createdAtTo = filters?.createdAtTo;
        if (createdAtFrom || createdAtTo) {
            where.createdAt = {
                ...(createdAtFrom ? { gte: new Date(createdAtFrom) } : {}),
                ...(createdAtTo ? { lte: new Date(createdAtTo) } : {}),
            };
        }

        const customerId = filters?.customerId ? Number(filters.customerId) : undefined;
        if (customerId) where.customerId = customerId;

        const status = filters?.status as OrderStatus | undefined;
        if (status) where.status = status;

        const appliedFilters: Array<{ label: string; value: string }> = [];

        if (customerId) {
            const customer = await prisma.customer.findUnique({
                where: { id: customerId, enterpriseId },
                include: { person: true },
            });
            appliedFilters.push({
                label: "Cliente",
                value:
                    customer?.person?.name ??
                    customer?.person?.legalName ??
                    `Cliente ${customerId}`,
            });
        }

        if (status) {
            appliedFilters.push({ label: "Status", value: saleStatusLabels[status] ?? status });
        }

        const sales = await prisma.saleOrder.findMany({
            where,
            include: {
                customer: { include: { person: true } },
                items: { include: { product: { include: { unity: true } } } },
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        });

        let totalSubtotal = 0;
        let totalDiscount = 0;
        let totalOtherCosts = 0;
        let grandTotal = 0;
        let totalItemsQuantity = 0;

        const orders = sales.map((sale) => {
            let subtotal = 0;
            let saleItemsQuantity = 0;

            const items = sale.items.map((item) => {
                const qty = toNumber(item.quantity);
                const unitPrice = toNumber(item.unitPrice);
                const total = qty * unitPrice;

                subtotal += total;
                saleItemsQuantity += qty;

                return {
                    name: item.product?.name ?? `ID ${item.productId}`,
                    quantity: formatDecimal(qty),
                    unity: item.product?.unity?.simbol ?? item.product?.unity?.description ?? "-",
                    unitPrice: formatCurrency(unitPrice),
                    total: formatCurrency(total),
                };
            });

            const discount = toNumber(sale.discount);
            const otherCosts = toNumber(sale.otherCosts);
            const total = subtotal - discount + otherCosts;

            totalSubtotal += subtotal;
            totalDiscount += discount;
            totalOtherCosts += otherCosts;
            grandTotal += total;
            totalItemsQuantity += saleItemsQuantity;

            return {
                code: sale.code,
                customerName:
                    sale.customer?.person?.name ??
                    sale.customer?.person?.legalName ??
                    `Cliente ${sale.customerId}`,
                status: saleStatusLabels[sale.status] ?? sale.status,
                statusClass: saleStatusClasses[sale.status] ?? saleStatusClasses.PENDING,
                createdAt: formatDateOnly(sale.createdAt, timeZone),
                total: formatCurrency(total),
                items,
            };
        });

        const rangeLabel =
            createdAtFrom || createdAtTo
                ? `${createdAtFrom ? formatDateOnly(createdAtFrom, timeZone) : "-"} até ${createdAtTo ? formatDateOnly(createdAtTo, timeZone) : "-"}`
                : "Todos os períodos";

        return {
            generatedAt: formatDate(new Date(), timeZone),
            rangeLabel,
            appliedFilters,
            orders,
            totals: {
                subtotal: formatCurrency(totalSubtotal),
                discount: formatCurrency(totalDiscount),
                otherCosts: formatCurrency(totalOtherCosts),
                total: formatCurrency(grandTotal),
            },
            ordersCount: orders.length,
            totalItemsQuantity: formatDecimal(totalItemsQuantity),
        };
    },
    template: {
        path: path.resolve(process.cwd(), "src", "reports", "templates", "sale-order-list.html"),
        render: ({ template, data }) => {
            const ordersBlocks = data.orders
                .map((order) => {
                    const itemsRows = order.items
                        .map(
                            (item) =>
                                `<tr><td>${item.name}</td><td>${item.quantity} ${item.unity}</td><td>${item.unitPrice}</td><td>${item.total}</td></tr>`
                        )
                        .join("");

                    return `
                        <div class="order-block">
                            <div class="order-header">
                                <div>
                                    <span class="order-code">#${order.code}</span>
                                    <span class="order-customer">${order.customerName}</span>
                                </div>
                                <div class="order-meta">
                                    <span>${order.createdAt}</span>
                                    <span class="badge ${order.statusClass}">${order.status}</span>
                                    <span class="order-total">${order.total}</span>
                                </div>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Produto</th>
                                        <th>Quantidade</th>
                                        <th>Valor unit.</th>
                                        <th>Total item</th>
                                    </tr>
                                </thead>
                                <tbody>${itemsRows}</tbody>
                            </table>
                        </div>`;
                })
                .join("");

            const filtersLine = data.appliedFilters
                .map(
                    (filter) =>
                        `<span class="filter-tag"><strong>${filter.label}:</strong> ${filter.value}</span>`
                )
                .join("");

            const replacements: Record<string, string> = {
                generatedAt: data.generatedAt,
                rangeLabel: data.rangeLabel,
                ordersCount: String(data.ordersCount),
                totalItemsQuantity: data.totalItemsQuantity,
                subtotal: data.totals.subtotal,
                discount: data.totals.discount,
                otherCosts: data.totals.otherCosts,
                grandTotal: data.totals.total,
                ordersBlocks,
                filtersLine,
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
        margin: { top: "18px", bottom: "18px", left: "0px", right: "0px" },
    },
};
