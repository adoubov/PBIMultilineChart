import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import { VisualSettings, graphSettings } from "./settings";
import * as d3 from 'd3';
import { Dictionary } from "./dictionary";
import { Legend } from "./legend";
import { LegendV } from "./legendV";
import * as models from "powerbi-models";
interface IChartConfigSettings {
    dataColours: IChartConfigValue[];
    lineStyles: IChartConfigValue[];
}
interface IChartConfigValue {
    name: string;
    type: string;
    value: string;
}
interface IDataColor {
    name: string;
    color: string;
}
interface ILineChartRow {
    xValue: number;
    yValuesLeft: number[];
    yValuesRight: number[];
    lineBy: string;
    visualGroupBy: string;
    trellisBy: string;
    tooltipData: string | number[];
}
interface INestedData {
    key: string;
    values: any;
    value: undefined;
}
interface ITrellisNestedData {
    trellisIndex: string;
    nestedData: INestedData[];
}
interface ITooltipMembers {
    tooltipMemberName: string;
    tooltipMemberDataIdx: number;
    isMeasure: boolean;
}
interface IDataType {
    measure: string;
    dataType: string;
}
export declare class Visual implements IVisual {
    private target;
    settings: VisualSettings;
    visualContainer: d3.Selection<HTMLDivElement, any, HTMLDivElement, any>;
    graphGridContainer: d3.Selection<HTMLDivElement, any, HTMLDivElement, any>;
    container: d3.Selection<HTMLDivElement, any, HTMLDivElement, any>;
    legendContainer: d3.Selection<HTMLDivElement, any, HTMLDivElement, any>;
    graphContainers: d3.Selection<HTMLDivElement, any, HTMLDivElement, any>[];
    data: ILineChartRow[];
    nestedData: INestedData[][];
    colourScale: d3.ScaleOrdinal<string, unknown>;
    lineStyleScale: d3.ScaleOrdinal<string, unknown>;
    colours: string[];
    lineStyles: string[];
    vertLegendNextY: number;
    trellisNestedData: ITrellisNestedData[];
    legend: Legend | LegendV;
    private graphs;
    graphSettings: graphSettings;
    measuresDictionary: Dictionary;
    visualGroupByDictionary: Dictionary;
    measuresLeft: string[];
    measuresRight: string[];
    measuresAll: string[];
    xCategoryName: string;
    xCategoryIsDate: boolean;
    trellisByCategoryName: string;
    lineByCategoryName: string;
    visualGroupByCategoryName: string;
    OPTIONS: VisualUpdateOptions;
    private host;
    visualFilter: models.IBasicFilter;
    filterValues: string[];
    private lineByDataType;
    private trellisValues;
    private dataUpdateExternalFilterOnly;
    private globalTooltipCanvas;
    private legendTooltipContainer;
    private legendTooltipText;
    private legendTooltipBackground;
    legendLineByCategoryName: string;
    legendVisualGroupingByCategoryName: string;
    dataTypes: IDataType[];
    tooltipMembers: ITooltipMembers[];
    private tableName;
    trellisByMeasure: boolean;
    legendByTrellis: boolean;
    monthNames: string[];
    dataColors: IDataColor[];
    chartConfig: IChartConfigSettings;
    constructor(options: VisualConstructorOptions);
    update(options: VisualUpdateOptions): void;
    private buildFilterArray;
    applyFilter(filterValue: string): boolean;
    clearFilter(): void;
    private static parseSettings;
    IncrementLineStyle(itemName: string, itemCategory: string): void;
    IncrementColour(itemName: string, itemCategory: string): void;
    ResetLineStyles(): void;
    ResetColours(): void;
    ShowLegendTooltip(tooltipText: string, x: number, y: number): void;
    MoveLegendTooltip(x: number, y: number): void;
    HideLegendTooltip(): void;
    SelectLines(line: string): void;
    GetColour(name: string, type: string): string;
    GetLineStyle(name: string, type: string): string;
    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */
    enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject;
}
export {};
