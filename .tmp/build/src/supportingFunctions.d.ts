import powerbi from "powerbi-visuals-api";
import * as d3 from 'd3';
interface ITooltipMembers {
    tooltipMemberName: string;
    tooltipMemberDataIdx: number;
    isMeasure: boolean;
}
export declare function SortNumbersCallback(a: any, b: any): 0 | 1 | -1;
export declare function GetYValues(valuesArray: powerbi.DataViewValueColumn[], index: number): number[];
export declare function GetTooltipValues(tooltipMembers: ITooltipMembers[], categoricalData: powerbi.DataViewCategorical, index: number): string | number[];
export declare function GetDistinctValues(categoricalData: powerbi.DataViewCategorical, groupings: IGroupBy[]): void;
export declare function InitializeLineByColourBy(categoricalData: powerbi.DataViewCategorical, lineBy: IGroupBy[], colourBy: IGroupBy[]): void;
export declare function GetColourString(colourBy: string, colourScale: d3.ScaleOrdinal<string, unknown>): string;
export declare function RenderMeasuresLegend(): void;
export declare function RenderLineByLegend(): void;
interface IGroupBy {
    propertyName: string;
    propertyValues: any[];
}
export {};
