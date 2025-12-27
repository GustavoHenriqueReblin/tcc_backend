export interface NestedItemsPayload<CreateInput, UpdateInput extends { id: number }> {
    create?: CreateInput[];
    update?: UpdateInput[];
    delete?: number[];
}

export interface NormalizedNestedItemsPayload<CreateInput, UpdateInput extends { id: number }> {
    create: CreateInput[];
    update: UpdateInput[];
    delete: number[];
}

export const normalizeNestedItemsPayload = <CreateInput, UpdateInput extends { id: number }>(
    payload?: NestedItemsPayload<CreateInput, UpdateInput>
): NormalizedNestedItemsPayload<CreateInput, UpdateInput> => {
    if (!payload) {
        return {
            create: [] as CreateInput[],
            update: [] as UpdateInput[],
            delete: [] as number[],
        };
    }

    return {
        create: payload.create ?? ([] as CreateInput[]),
        update: payload.update ?? ([] as UpdateInput[]),
        delete: payload.delete ?? [],
    };
};

export function validateNestedPayload(
    name: string,
    body: unknown
): { ok: true } | { ok: false; message: string } {
    if (body === undefined) return { ok: true }; // campo opcional
    if (typeof body !== "object" || body === null) {
        return { ok: false, message: `${name} deve ser um objeto` };
    }

    const obj = body as Record<string, unknown>;

    if (!("create" in obj) || !("update" in obj) || !("delete" in obj)) {
        return {
            ok: false,
            message: `${name} deve conter as propriedades create, update e delete`,
        };
    }

    if (obj.create !== undefined && !Array.isArray(obj.create)) {
        return { ok: false, message: `${name}.create deve ser um array` };
    }

    if (obj.update !== undefined && !Array.isArray(obj.update)) {
        return { ok: false, message: `${name}.update deve ser um array` };
    }

    if (obj.delete !== undefined && !Array.isArray(obj.delete)) {
        return { ok: false, message: `${name}.delete deve ser um array` };
    }

    return { ok: true };
}
