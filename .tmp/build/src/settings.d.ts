import { dataViewObjectsParser } from "powerbi-visuals-utils-dataviewutils";
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;
export declare class VisualSettings extends DataViewObjectsParser {
    graphSettings: graphSettings;
}
export declare class graphSettings {
    dateContinuous: boolean;
    enableMultipleYAxes: boolean;
    showSliders: boolean;
    colourByMeasure: boolean;
    trellisByMeasure: boolean;
    enableTooltips: boolean;
    enableCrossVizFilters: boolean;
    xScaleByTrellis: boolean;
    yScaleByTrellis: boolean;
    distinctVisualGroupByStylesPerTrellis: boolean;
    distinctMeasureStylesPerTrellis: boolean;
    legendByTrellis: boolean;
    showTrellisTitle: boolean;
    showLineLabels: boolean;
    trellisColumns: number;
    chartConfig: string;
    trellisAutoLayout: boolean;
    verticalLegend: boolean;
}
export declare class dataColors {
}
