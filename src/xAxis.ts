"use strict";

import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import { VisualSettings, graphSettings } from "./settings";
import * as d3 from 'd3';
import { ValidateData } from "./dataValidation";
import { SortNumbersCallback, GetDistinctValues, InitializeLineByColourBy, GetColourString, GetYValues } from "./supportingFunctions";
import { HorizontalRangeSlider } from "./rangeSlider"
import { Visual } from "./visual"
import { D3BrushEvent, gray, nest } from "d3";
import { Graph } from "./graph";
import { Left, Right, Colour, LineStyle } from "./constants";
import { Dictionary } from "./dictionary";



interface IGroupBy {
    propertyName: string,
    propertyValues: any[]
}

interface ILineChartRow {
    xValue: number,
    yValuesLeft: number[],
    yValuesRight: number[],
    lineBy: string,
    visualGroupBy: string,
    trellisBy: string
}

interface INestedData {
    key: string,
    values: any,
    value: undefined
}

interface IMargin {
    top: number,
    right: number,
    bottom: number,
    left: number
}

export class XAxis {

    public parentGraph: Graph;

    
    public xScale: d3.ScaleLinear<number, number>; 
    private xAxis: d3.Selection<SVGGElement, any, HTMLDivElement, any>;

    public sliderContainer: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    private rangeSlider: HorizontalRangeSlider;

    public xAxisYPosition: number;

    public parentSVG: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    public xAxisDesc: string;


    private graphSettings: graphSettings;
    public xValues: number[];
    private ticksCount: number;
    private tickDateFormat: string;

constructor(parentGraph: Graph){
    this.parentGraph = parentGraph;
   

    this.xAxisYPosition = 1;

    this.parentSVG = this.parentGraph.svg;

    this.graphSettings = parentGraph.parentVisual.graphSettings;
    //this.yAxisDesc = this.yAxisAlignment+(yAxisIndex.toString());
    this.xValues = [];
    
    this.initYAxis();
}

private initYAxis(): void {

    let thisObject = this;

/*    
let maxDataValue: number = d3.max(
    this.parentGraph.nestedData.map((lineValues) => {
        return this.renderAllMeasures ?
        d3.max(lineValues.values, (d: ILineChartRow) => { return this.yAxisAlignment == Left ? d3.max(d.yValuesLeft): d3.max(d.yValuesRight); })
        : d3.max(lineValues.values, (d: ILineChartRow) => { return this.yAxisAlignment == Left ? +d.yValuesLeft[thisObject.yAxisIndex]: +d.yValuesRight[thisObject.yAxisIndex]; });
    }))
*/
    /*
    let maxDataValue = d3.max(
        this.parentGraph.nestedData.map((lineValues) => {
            d3.max(lineValues.values, (d: ILineChartRow) => { return  d3.max(d.xValue) })
        }))    
        */
    //let xValues = [];
    this.parentGraph.nestedData.forEach((nestedData) => {
        /*
        d3.extent(
            nestedData.values.map((val) => {
                return xValues
            })
        ).forEach((filteredVal) => {
            xValues.push(filteredVal);
        })
        */
       nestedData.values.forEach((val) => {
           if(this.xValues.indexOf(val.xValue) == -1) {
            this.xValues.push(val.xValue);
           }
       })

    });
    this.xValues.sort(SortNumbersCallback);
    //console.log("im here");
    let xMin: number;
    let xMax: number;

    if(this.parentGraph.parentVisual.graphSettings.xScaleByTrellis) {
        xMin = this.xValues[0];
        xMax = this.xValues[this.xValues.length - 1];
    }
    else {
        let xValuesAll = this.parentGraph.parentVisual.data.map(row => row.xValue).sort(SortNumbersCallback);
        xMin = xValuesAll[0];
        xMax = xValuesAll[xValuesAll.length - 1];
    }
    //console.log(xMin, xMax)
    //X Scale
    this.xScale = d3.scaleLinear()
    //.domain(d3.extent(this.xValues))
    .domain([xMin, xMax])
    /*
    .domain(() => {
        if(this.parentGraph.parentVisual.graphSettings.xScaleByTrellis) {
            return d3.extent(this.xValues);
        }
        else {
            return d3.extent(this.xValues);
        }
    })
    */
    .range([0, (this.parentGraph.width)])
    .clamp(true);


    //ticks
    //let ticksCount = Math.ceil(this.parentGraph.width / 70);

    if(this.parentGraph.parentVisual.xCategoryIsDate && this.parentGraph.parentVisual.graphSettings.dateContinuous) {
        this.tickDateFormat = this.GetDateFormat(xMin, xMax);
    }
    this.ticksCount = this.CalcTicksCount(xMin, xMax);
    //this.xTickValues = this.CalcTickValues();

    //X Axis
    this.xAxis = this.parentSVG.append("g")
    .attr("transform", "translate(0," + (this.parentGraph.height + 10) + ")")
    .call(d3.axisBottom(this.xScale)
    .ticks(this.ticksCount)
    //.tickValues(this.xTickValues)
    .tickFormat((d) => {
        /*
        if(this.parentGraph.parentVisual.xCategoryIsDate) {
            let xValDate = new Date(0);
            let utcSeconds = d as number;
            xValDate.setUTCSeconds(utcSeconds);
             let xValDateString = xValDate.getDate().toString() + "/" + (xValDate.getMonth() + 1).toString() + "/" + xValDate.getFullYear().toString();
            return xValDateString;
            
        }
        else {
            return d3.format("~s")(d) 
        }
        */
       return this.FormatAxisTicks(d as number);
    })
    );

    //Slider
    if(this.parentGraph.parentVisual.graphSettings.showSliders)
    {

        this.sliderContainer = this.parentSVG.append("g")
        .attr("class", "slider")
        .attr("transform", "translate(0," + (this.parentGraph.height + 10) + ")");
    
        this.rangeSlider = new HorizontalRangeSlider(this);
    }

}

public UpdateAxisDomain(newDomain: [number, number]): void {

    let thisObject = this;

    this.xScale.domain(newDomain);

    if(this.parentGraph.parentVisual.xCategoryIsDate && this.parentGraph.parentVisual.graphSettings.dateContinuous) {
        this.tickDateFormat = this.GetDateFormat(newDomain[0], newDomain[1]);
    }
    this.ticksCount = this.CalcTicksCount(newDomain[0], newDomain[1]);
    
    //Update Axis
    this.xAxis
    .attr("transform", "translate(0," + (this.parentGraph.height + 10) + ")")
    .transition()
    .duration(5)
    .call(d3.axisBottom(this.xScale)
    .ticks(this.ticksCount)
    .tickFormat((d) => {
        /*
        if(this.parentGraph.parentVisual.xCategoryIsDate) {
            let xValDate = new Date(0);
            let utcSeconds = d as number;
            xValDate.setUTCSeconds(utcSeconds);
             let xValDateString = xValDate.getDate().toString() + "/" + (xValDate.getMonth() + 1).toString() + "/" + xValDate.getFullYear().toString();
            return xValDateString;
        }
        else {
            return d3.format("~s")(d) 
        }
        */
       
       return this.FormatAxisTicks(d as number);
    })    
    );

    //Update Lines
    //this.UpdateLines();
    this.parentGraph.yAxes.forEach((yAxis) => {
        yAxis.UpdateLines();
    })
}

private GetDateFormat(min: number, max: number): string {
    let minDate = new Date(0);
    minDate.setUTCSeconds(min);
    let maxDate = new Date(0);
    maxDate.setUTCSeconds(max);

    if(maxDate.getMonth() - minDate.getMonth() <= 2) {
        return "md"
    }
    else if(maxDate.getFullYear() - minDate.getFullYear() <= 3) {
        return "my"
    }
    else {
        return "y"
    }
}

private FormatAxisTicks(data: number): string {
    if(this.parentGraph.parentVisual.xCategoryIsDate) {

        let xValDate = new Date(0);
        let utcSeconds = data;
        xValDate.setUTCSeconds(utcSeconds);

        if(this.parentGraph.parentVisual.graphSettings.dateContinuous) {
            if(this.tickDateFormat == "md") {
                let xValDateString = this.parentGraph.parentVisual.monthNames[xValDate.getMonth()] + " " + xValDate.getDate().toString();
                return xValDateString;
            }
            else if(this.tickDateFormat == "my") {
                let xValDateString = this.parentGraph.parentVisual.monthNames[xValDate.getMonth()] + " " + xValDate.getFullYear().toString();
                return xValDateString;
            }
            else {
                let xValDateString = xValDate.getFullYear().toString();
                return xValDateString;
            }
        }
        else {
             let xValDateString = xValDate.getDate().toString() + "/" + (xValDate.getMonth() + 1).toString() + "/" + xValDate.getFullYear().toString();
            return xValDateString;
        }

    }
    else {
        return d3.format("~s")(data) 
    }
}

private CalcTicksCount(min: number, max: number): number {
    let ticksCount: number;
    let ticksCountDivisor = 70;
    let ticksCountBase = Math.ceil(this.parentGraph.width / ticksCountDivisor)

    if(this.parentGraph.parentVisual.xCategoryIsDate && this.parentGraph.parentVisual.graphSettings.dateContinuous) {
        /*
        let minDate = new Date(0);
        minDate.setUTCSeconds(min);
        let maxDate = new Date(0);
        maxDate.setUTCSeconds(max);
        */
        let timeDiff = max - min;
        let granularityPoints: number;
        if(this.tickDateFormat == "md") {
            /*
            granularityPoints = 1 + maxDate.getDate() - minDate.getDate();
            */
            granularityPoints = Math.floor(timeDiff / (60 * 60 * 24));
        }
        else if(this.tickDateFormat == "my") {
            /*
            granularityPoints = (maxDate.getFullYear() - minDate.getFullYear()) * 12;
            granularityPoints -= minDate.getMonth();
            granularityPoints += maxDate.getMonth();
            */
           granularityPoints = Math.floor(timeDiff / (60 * 60 * 24 * 30));
        }
        else {
            granularityPoints = Math.floor(timeDiff / (60 * 60 * 24 * 365));
        }
        if (granularityPoints === 0) granularityPoints = 1;
        ticksCount = Math.min(granularityPoints, ticksCountBase);
    }
    else {
        ticksCount = ticksCountBase
    } 
    return ticksCount;
}

}