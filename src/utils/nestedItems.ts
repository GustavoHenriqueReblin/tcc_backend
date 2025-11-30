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
