const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const isValidNumber = (value: unknown): value is number =>
    typeof value === "number" && !Number.isNaN(value);

export interface NestedItemsValidationOptions {
    createRequiredFields: string[];
    numericCreateFields?: string[];
    numericUpdateFields?: string[];
}

interface NestedPayload {
    create?: unknown;
    update?: unknown;
    delete?: unknown;
}

export const isValidNestedItemsPayload = (
    payload: unknown,
    options: NestedItemsValidationOptions
): boolean => {
    if (payload === undefined) return true;
    if (!isPlainObject(payload)) return false;

    const nested = payload as NestedPayload;
    const numericCreateFields = options.numericCreateFields ?? options.createRequiredFields;
    const numericUpdateFields = options.numericUpdateFields ?? options.createRequiredFields;

    if (nested.create !== undefined) {
        if (!Array.isArray(nested.create)) return false;
        for (const entry of nested.create) {
            if (!isPlainObject(entry)) return false;
            for (const field of options.createRequiredFields) {
                const value = entry[field];
                if (value === undefined || value === null) return false;
            }

            for (const field of numericCreateFields) {
                const value = entry[field];
                if (value !== undefined && value !== null && !isValidNumber(value)) {
                    return false;
                }
            }

            if (entry.id !== undefined && entry.id !== null && !isValidNumber(entry.id)) {
                return false;
            }
        }
    }

    if (nested.update !== undefined) {
        if (!Array.isArray(nested.update)) return false;
        for (const entry of nested.update) {
            if (!isPlainObject(entry)) return false;
            if (!isValidNumber(entry.id)) return false;

            for (const field of numericUpdateFields) {
                const value = entry[field];
                if (value !== undefined && value !== null && !isValidNumber(value)) {
                    return false;
                }
            }
        }
    }

    if (nested.delete !== undefined) {
        if (!Array.isArray(nested.delete)) return false;
        if (!nested.delete.every(isValidNumber)) return false;
    }

    return true;
};
