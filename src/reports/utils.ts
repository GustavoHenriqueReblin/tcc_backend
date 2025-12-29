export const formatDate = (value: Date | string | null | undefined) =>
    value ? new Date(value).toLocaleString("pt-BR") : "-";

export const toNumber = (value: unknown): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value.replace(",", ".")) || 0;
    // Prisma Decimal has toNumber
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (value as any).toNumber === "function") return (value as any).toNumber();
    return Number(value) || 0;
};

export const formatDecimal = (value: unknown, fractionDigits = 3) => {
    const num = toNumber(value);
    return num.toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: fractionDigits,
    });
};

export const formatCurrency = (value: unknown) =>
    toNumber(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
