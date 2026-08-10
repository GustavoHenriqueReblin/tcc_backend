import type { ReportDefinition, ReportRegistry } from "./report.types";
import { saleOrderReport } from "./definitions/saleOrderReportDefinition";
import { saleOrderListReport } from "./definitions/saleOrderListReportDefinition";
import { productionOrderReport } from "./definitions/productionOrderReportDefinition";

export const reportRegistry: ReportRegistry = {
    [productionOrderReport.key]: productionOrderReport as ReportDefinition<unknown>,
    [saleOrderReport.key]: saleOrderReport as ReportDefinition<unknown>,
    [saleOrderListReport.key]: saleOrderListReport as ReportDefinition<unknown>,
};
