import "core-js/stable";
import "./../style/visual.less";
import * as d3 from 'd3';
import { Visual } from "./visual";
import { YAxis } from "./yAxis";
import { XAxis } from "./xAxis";
interface INestedData {
    key: string;
    values: any;
    value: undefined;
}
interface IMargin {
    top: number;
    right: number;
    bottom: number;
    left: number;
}
interface IBounds {
    top: number;
    right: number;
    bottom: number;
    left: number;
}
interface IDataType {
    measure: string;
    dataType: string;
}
export declare class Graph {
    parentVisual: Visual;
    width: number;
    height: number;
    margin: IMargin;
    trellisIndex: number;
    nestedData: INestedData[];
    svg: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    legendContainer: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    legendTrellis: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    legendColour: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    legendLineStyle: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    legendColourPicker: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    colourScale: d3.ScaleOrdinal<string, unknown>;
    lineStyleScale: d3.ScaleOrdinal<string, unknown>;
    xAxis: XAxis;
    yAxes: YAxis[];
    private nextColourLegendItemX;
    private nextLineStyleLegendItemX;
    private graphMouseOverHandler;
    private tooltipContainer;
    private tooltipLine;
    private tooltipValuesContainer;
    private graphAreaLeftAbsoluteBound;
    private graphAreaTopAbsoluteBound;
    private tooltipLabels;
    private tooltipBackground;
    private tooltipPoints;
    private tooltipTopLabel;
    private tooltipCategoryValue;
    private tooltipDivider;
    private tooltipMeasures;
    private tooltipValues;
    private tooltipCustomValues;
    private tooltipNearestLine;
    private maxLabelWidth;
    private maxValueWidth;
    private tooltipMarginVertical;
    private tooltipMarginHorizontal;
    private tooltipValuesContainerWidth;
    private tooltipValuesContainerHeight;
    private tooltipLineByValues;
    private selectedTooltipLineByValue;
    private selectedTooltipXValue;
    private selectedTooltipValueLabel;
    private colourPickerContext;
    trellisValue: any;
    private legend;
    graphBounds: IBounds;
    private lineLabels;
    dataTypes: IDataType[];
    constructor(parentVisual: Visual, width: number, height: number, margin: IMargin, trellisIndex: number, trellisValue: string | number, dataTypes: IDataType[]);
    private initGraph;
    HighlightLine(line: string): void;
    SelectLine(line: string): void;
    private CalcRelativeMousePosition;
    private CalcTooltipX;
    private CalcTooltipY;
    private GetClosest;
    private FindNearestX;
    private CalculateTooltipValues;
    private MoveTooltipPoints;
    private MoveTooltip;
    OnGraphMouseOver(mousePageXPosition: number, mousePageYPosition: number): void;
    private OnGraphMouseMove;
    OnGraphMouseOut(): void;
    IncrementColour(colourIndex: string): void;
    ResetColours(): void;
    IncrementLineStyle(lineStyleIndex: string): void;
    ResetLineStyles(): void;
    private SetLabelLine;
}
export {};
