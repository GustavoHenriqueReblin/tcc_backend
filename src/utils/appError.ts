/**
 * AppError — erro customizado da aplicação
 * usado para lançar mensagens com status HTTP específicos.
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly context?: string;
    public readonly original?: unknown;

    constructor(message: string, statusCode = 400, context?: string, original?: unknown) {
        super(message);
        this.statusCode = statusCode;
        this.context = context;
        this.original = original;

        Object.setPrototypeOf(this, new.target.prototype);
        this.name = this.constructor.name;
    }
}
