import type { ReportDefinition, ReportRegistry } from "./report.types";
import { saleOrderReport } from "./definitions/saleOrderReportDefinition";
import { productionOrderReport } from "./definitions/productionOrderReportDefinition";

export const reportRegistry: ReportRegistry = {
    [productionOrderReport.key]: productionOrderReport as ReportDefinition<unknown>,
    [saleOrderReport.key]: saleOrderReport as ReportDefinition<unknown>,
};
