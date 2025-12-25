export type ReportKey = string;

type PdfOptions = Parameters<import("playwright").Page["pdf"]>[0];

export interface ReportRequestContext {
    id: string;
    enterpriseId: number;
}

export type ReportDataFetcher<TData> = (context: ReportRequestContext) => Promise<TData>;

export interface ReportRenderParams<TData> {
    template: string;
    data: TData;
}

export type ReportRenderer<TData> = (params: ReportRenderParams<TData>) => string;

export interface ReportTemplateConfig<TData> {
    path: string;
    render?: ReportRenderer<TData>;
}

export interface ReportDefinition<TData = unknown> {
    key: ReportKey;
    dataFetcher: ReportDataFetcher<TData>;
    template: ReportTemplateConfig<TData>;
    pdfOptions?: Omit<PdfOptions, "path">;
}

export type ReportRegistry = Record<ReportKey, ReportDefinition<unknown>>;
