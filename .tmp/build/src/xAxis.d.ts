import "core-js/stable";
import "./../style/visual.less";
import * as d3 from 'd3';
import { Graph } from "./graph";
export declare class XAxis {
    parentGraph: Graph;
    xScale: d3.ScaleLinear<number, number>;
    private xAxis;
    sliderContainer: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    private rangeSlider;
    xAxisYPosition: number;
    parentSVG: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    xAxisDesc: string;
    private graphSettings;
    xValues: number[];
    private ticksCount;
    private tickDateFormat;
    constructor(parentGraph: Graph);
    private initYAxis;
    UpdateAxisDomain(newDomain: [number, number]): void;
    private GetDateFormat;
    private FormatAxisTicks;
    private CalcTicksCount;
}
