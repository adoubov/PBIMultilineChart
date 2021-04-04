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
import { GetDistinctValues, InitializeLineByColourBy, GetColourString, GetYValues } from "./supportingFunctions";
import { VerticalRangeSlider } from "./rangeSlider"
import { Visual } from "./visual"
import { D3BrushEvent, gray, max } from "d3";
import { Graph } from "./graph";
import { Left, Right, Colour, LineStyle } from "./constants";
import { Dictionary } from "./dictionary";
import { LineLabel } from "./lineLabel";

interface IDataType {
    measure: string,
    dataType: string
}

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



export class YAxis {

    public parentGraph: Graph;
    private yAxisIndex: number;

    private renderAllMeasures: boolean;
    
    public yScale: d3.ScaleLinear<number, number>; 
    private yAxis: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    private lineGroupings: d3.Selection<SVGPathElement, INestedData, SVGGElement, any>[];    

    public sliderContainer: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    private rangeSlider: VerticalRangeSlider;
    private lineClass: string;
    public yAxisXPosition: number;
    private yAxisAlignment: string;

    public parentSVG: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    public yAxisDesc: string;

    private colourScale: d3.ScaleOrdinal<string, unknown>;
    private lineStyleScale: d3.ScaleOrdinal<string, unknown>;
    private measures: string[];
    private measuresDictionary: Dictionary;
    private visualGroupByDictionary: Dictionary;

    private graphSettings: graphSettings;
    private lineLabels: LineLabel[];

    private powerBIFormat: string;
    private ticksCount: number;

constructor(parentGraph: Graph, yAxisIndex: number, renderAllMeasures: boolean, axisAlignment: string){
    this.parentGraph = parentGraph;
    this.yAxisIndex = yAxisIndex;
    this.renderAllMeasures = renderAllMeasures;
    this.lineGroupings = [];

    this.colourScale = parentGraph.parentVisual.colourScale;
    this.lineStyleScale = parentGraph.parentVisual.lineStyleScale;
    this.measures = axisAlignment === Left ? this.parentGraph.parentVisual.measuresLeft : this.parentGraph.parentVisual.measuresRight;
    this.measuresDictionary = parentGraph.parentVisual.measuresDictionary;
    this.visualGroupByDictionary = parentGraph.parentVisual.visualGroupByDictionary;

    //line class used to set line styles
    //this.lineClass = this.yAxisIndex % 2 === 0 ? 'lineGroup1' : 'lineGroup2';
    
    this.yAxisAlignment = axisAlignment;

    let yAxisXPositionInitial = this.yAxisAlignment === Left ? 0 : this.parentGraph.width;
    let yAxisXPositionDirection = this.yAxisAlignment === Left ? -1 : 1;

    this.yAxisXPosition = yAxisXPositionInitial + yAxisXPositionDirection * (yAxisIndex * 50 + 10);

    this.parentSVG = this.parentGraph.svg;

    this.graphSettings = parentGraph.parentVisual.graphSettings;
    this.lineLabels = [];
    //this.yAxisDesc = this.yAxisAlignment+(yAxisIndex.toString());
    //this.powerBIFormat = this.parentGraph.parentVisual.data.

    this.ticksCount = Math.ceil(this.parentGraph.height / 85);

    this.initYAxis();
}

private initYAxis(): void {

    let thisObject = this;
    let maxDataValue: number;
/*
    let maxDataValue: number = this.renderAllMeasures ?
    d3.max(this.parentGraph.parentVisual.data, function (d) { return this.yAxisAlignment == Left ? d3.max(d.yValuesLeft) : d3.max(d.yValuesRight); })
     : d3.max(this.parentGraph.parentVisual.data, function (d) { return this.yAxisAlignment == Left ? +d.yValuesLeft[thisObject.yAxisIndex]: +d.yValuesRight[thisObject.yAxisIndex]; });
*/
/*
let maxDataValue: number = d3.max(
    this.parentGraph.nestedData.map((lineValues) => {
        return this.renderAllMeasures ?
        d3.max(lineValues.values, (d: ILineChartRow) => { return this.yAxisAlignment == Left ? d3.max(d.yValuesLeft): d3.max(d.yValuesRight); })
        : d3.max(lineValues.values, (d: ILineChartRow) => { return this.yAxisAlignment == Left ? +d.yValuesLeft[thisObject.yAxisIndex]: +d.yValuesRight[thisObject.yAxisIndex]; });
    }))
*/

    if(this.graphSettings.yScaleByTrellis) {
        maxDataValue = d3.max(
            this.parentGraph.nestedData.map((lineValues) => {
                return this.renderAllMeasures ?
                d3.max(lineValues.values, (d: ILineChartRow) => { return this.yAxisAlignment == Left ? d3.max(d.yValuesLeft): d3.max(d.yValuesRight); })
                : d3.max(lineValues.values, (d: ILineChartRow) => { return this.yAxisAlignment == Left ? +d.yValuesLeft[thisObject.yAxisIndex]: +d.yValuesRight[thisObject.yAxisIndex]; });
            }))
    }
    else {
        maxDataValue = this.renderAllMeasures ? 
        d3.max(this.parentGraph.parentVisual.data, (d: ILineChartRow) => { return this.yAxisAlignment == Left ? d3.max(d.yValuesLeft): d3.max(d.yValuesRight); })
                : d3.max(this.parentGraph.parentVisual.data, (d: ILineChartRow) => { return this.yAxisAlignment == Left ? +d.yValuesLeft[thisObject.yAxisIndex]: +d.yValuesRight[thisObject.yAxisIndex]; });
    }
    //console.log("max y value: ", maxDataValue)
    //Y Scale
    this.yScale = d3.scaleLinear()
    .domain([0, maxDataValue * 1.05])
    .range([this.parentGraph.height , 0])
    .clamp(true);


    //let ticksCount = Math.ceil(this.parentGraph.height / 105);

    //Y Axis
    this.yAxis = this.parentSVG.append("g")
    //.attr("class", this.lineClass) 
    .attr("class", () => {
        if(this.graphSettings.colourByMeasure || !this.graphSettings.enableMultipleYAxes) {
            //Axis is always a solid line if measures are differentiated by colour - it has no relation to the visual group by
            return "lineGroup1";
        }
        //otherwise return line style by measure
        else if(!this.graphSettings.colourByMeasure && this.parentGraph.parentVisual.trellisByMeasure) {
            let measure = this.parentGraph.parentVisual.measuresAll[this.parentGraph.trellisIndex];
            //return this.lineStyleScale(this.measuresDictionary.Value(measure)).toString();
            return this.parentGraph.parentVisual.GetLineStyle(measure, "MODEL_MEASURE");
        }
        else {
            let measure = this.measures[this.yAxisIndex];
            //return this.lineStyleScale(this.measuresDictionary.Value(measure)).toString();
            return this.parentGraph.parentVisual.GetLineStyle(measure, "MODEL_MEASURE");
        }
        

    })
    .attr("stroke", () => {

        let measureToColourBy;
        if(this.graphSettings.colourByMeasure && this.graphSettings.enableMultipleYAxes && !this.parentGraph.parentVisual.trellisByMeasure) {
            measureToColourBy = this.measures[this.yAxisIndex];
        }
         else if(this.parentGraph.parentVisual.trellisByMeasure && this.graphSettings.colourByMeasure) {
            measureToColourBy = this.parentGraph.parentVisual.measuresAll[this.parentGraph.trellisIndex];
         }

         if(measureToColourBy) return this.parentGraph.parentVisual.GetColour(measureToColourBy, "MODEL_MEASURE");

         else {
             return "";
         }
  
    })
    .attr("transform", "translate(" + this.yAxisXPosition + " ,0)")
    //.on("mouseover", this.ShowSliders)
    //.on("mouseout", this.HideSliders)
    .call(d3["axis"+this.yAxisAlignment](this.yScale)
    .ticks(this.ticksCount)
    .tickFormat((d) => { 
        return d3.format(this.GetTickFormatString())(d);
     }));
    //.tickFormat(function(d) { return d3.format("~s")(d) }));



    //.call(d3.axisBottom(this.yScale).tickFormat);

    /*
    this.mouseoverHandler = this.parentSVG.append('rect')
    .attr("width", 20)
    .attr("height", this.parentGraph.height + 20)
    .attr("transform", "translate(" + (this.yAxisXPosition - 10) + " ,-10)")
*/

    //Line(s)
    if(this.renderAllMeasures){
        this.parentGraph.parentVisual.data[0]["yValues"+this.yAxisAlignment].forEach((d, idx) => { 
            this.lineGroupings.push(this.DrawLines(idx))
            //this.lineLabels.push(new LineLabel(this.parentGraph, "test123", 0, idx * 10, this.lineGroupings[this.lineGroupings.length - 1]));
         });
    }
    else{
        this.lineGroupings.push(this.DrawLines(this.yAxisIndex));
        //this.RenderLineLabels(this.yAxisIndex);
        //this.lineLabels.push(new LineLabel(this.parentGraph, "test123", 0, this.yAxisIndex * 10, this.lineGroupings[this.lineGroupings.length - 1]));
    }
    /*
    console.log("test lines: ", this.lineGroupings)
    this.lineGroupings.forEach((line, idx) => {
        this.lineLabels.push(new LineLabel(this.parentGraph, "test123", 0, idx * 10, line));
        //console.log("aeresrwr")
    });
    */

    //Slider
    if(this.parentGraph.parentVisual.graphSettings.showSliders)
    {

        this.sliderContainer = this.parentSVG.append("g")
        .attr("class", "slider")
        .attr("transform", "translate("+ this.yAxisXPosition + "," + (0) + ")");
    
        this.rangeSlider = new VerticalRangeSlider(this);
    }

    
    //Add Legend Items
    //Colour Legend
    /*
    if(this.graphSettings.colourByMeasure) {
        if(this.graphSettings.enableMultipleYAxes) {
            this.parentGraph.AddLegendItem(Colour, this.measures[this.yAxisIndex], this.colourScale(this.measuresDictionary.Value(this.measures[this.yAxisIndex])).toString())
        }
        else {
            this.measures.forEach((measure) => {
                this.parentGraph.AddLegendItem(Colour, measure, this.colourScale(this.measuresDictionary.Value(measure)).toString())
            })
        }
    }

    else {
        if(this.graphSettings.enableMultipleYAxes) {
            this.parentGraph.AddLegendItem(Colour, this.parentGraph.nestedData[this.yAxisIndex].values[0].visualGroupBy, 
                this.colourScale(this.visualGroupByDictionary.Value(this.parentGraph.nestedData[this.yAxisIndex].values[0].visualGroupBy)).toString()
                )
        }
        else {

        }
    }
    */

}


public UpdateAxisDomain(newDomain: [number, number]): void {
    let thisObject = this;

    //console.log("nested data: ", this.parentGraph.nestedData)
    this.yScale.domain(newDomain);
    
    //Update Axis
    this.yAxis
    //.attr("class", this.lineClass)
    /*
    .attr("class", () => {
        if(this.graphSettings.colourByMeasure || !this.graphSettings.enableMultipleYAxes) {
            //Axis is always a solid line if measures are differentiated by colour - it has no relation to the visual group by
            return "lineGroup1";
        }
        //otherwise return line style by measure
        else {
            let measure = this.measures[this.yAxisIndex];
            //console.log('debug line styles - measure: ', measure, 'measure index: ', this.measuresDictionary.Value(measure), 'measure line style: ', this.lineStyleScale(this.measuresDictionary.Value(measure)).toString())
            return this.lineStyleScale(this.measuresDictionary.Value(measure)).toString();
        }
    })
    */
    .attr("transform", "translate(" + this.yAxisXPosition + " ,0)")
    .transition()
    .duration(5)
    .call(d3["axis"+this.yAxisAlignment](this.yScale)
    //.tickFormat(function(d) { return d3.format("~s")(d) })
    .ticks(this.ticksCount)
    .tickFormat((d) => { 
        return d3.format(this.GetTickFormatString())(d);
     })
    );

    //Update Lines
    this.UpdateLines();

}

private OnLineMouseOver(mousePageXPosition: number, mousePageYPosition: number) {
    this.parentGraph.OnGraphMouseOver(mousePageXPosition, mousePageYPosition);
}

private OnLineMouseOut() {
    this.parentGraph.OnGraphMouseOut();
}

private DrawLines(yValueIndex: number): d3.Selection<SVGPathElement, INestedData, SVGGElement, any> {
    let thisObject = this;

    let lines = this.parentSVG.selectAll(".line")
    .data(this.parentGraph.nestedData)
    .enter()
    .append("path")
    .attr("fill", "none")
    .attr("pointer-events", "none")
    .attr("chartLine", 1)
    .attr("lineByValue", (d) => {
        return d.key;
    })
    .attr("stroke", (d) => {
       let name;
       let type;
       if(this.graphSettings.colourByMeasure) {
        name = this.parentGraph.parentVisual.trellisByMeasure ? this.parentGraph.parentVisual.measuresAll[this.parentGraph.trellisIndex] : this.measures[yValueIndex];
        type = "MODEL_MEASURE"
       }
       else {
        name = d.values[0].visualGroupBy;
        type = this.parentGraph.parentVisual.visualGroupByCategoryName
       }
       return this.parentGraph.parentVisual.GetColour(name, type);

    })
    .attr("stroke-width", 1.5)
    //.attr("class", this.lineClass)
    .attr("class", (d) => {
        let name;
        let type;
        if(this.graphSettings.colourByMeasure) {
            //return this.lineStyleScale(this.visualGroupByDictionary.Value(d.values[0].visualGroupBy)).toString();
            name = d.values[0].visualGroupBy;
            type = this.parentGraph.parentVisual.visualGroupByCategoryName;
        }
        else {
            //return this.lineStyleScale(this.measuresDictionary.Value(this.measures[yValueIndex])).toString();
            let lineStyleString =
            //(this.parentGraph.parentVisual.trellisByMeasure) ? this.lineStyleScale(this.measuresDictionary.Value(this.parentGraph.parentVisual.measuresAll[this.parentGraph.trellisIndex])).toString()
            //: this.lineStyleScale(this.measuresDictionary.Value(this.measures[yValueIndex])).toString();
            //return lineStyleString;
            name = this.parentGraph.parentVisual.trellisByMeasure ? this.parentGraph.parentVisual.measuresAll[this.parentGraph.trellisIndex]: this.measures[yValueIndex];
            type = "MODEL_MEASURE";
        }
        return this.parentGraph.parentVisual.GetLineStyle(name, type);
    })
    .attr("d", function (d) {
        //console.log("line data: ", d, yValueIndex)
        let yIndex;
        if(thisObject.parentGraph.parentVisual.trellisByMeasure) yIndex = 0;
        else yIndex = yValueIndex;

        return d3.line<ILineChartRow>()
            .x(function (d) { return thisObject.parentGraph.xAxis.xScale(d.xValue); })
            .y(function (d) { 
                //return thisObject.yScale(+d["yValues"+thisObject.yAxisAlignment][yValueIndex]);

                return thisObject.yScale(+d["yValues"+thisObject.yAxisAlignment][yIndex]);
             })
            (d.values.filter(val => {return val["yValues"+thisObject.yAxisAlignment][yIndex] != null}))
            //(d.values)
    }
    )
    .on("mouseover", () => {
        if (this.graphSettings.enableTooltips) {
            this.OnLineMouseOver(d3.event.pageX, d3.event.pageY);
        }
    })
    .on("mouseout", () => {
        if (this.graphSettings.enableTooltips) {
            this.OnLineMouseOut();
        }
    })
    .on("click", (d) => {
        /*
        //console.log("line by filter: "+d.values[0].lineBy);
        let filterValue = d.values[0].lineBy as number;
        console.log("filter value: ",filterValue);
        this.parentGraph.parentVisual.applyFilter(filterValue);
        */
    });
    return lines;

}

public UpdateLines(): void {
    let thisObject = this;

    
    this.lineGroupings.forEach((lineGrouping, idx) => {

        //console.log("updating line ...")
        lineGrouping
        .data(this.parentGraph.nestedData)
        .attr("fill", "none")
        /*
        .attr("stroke", (d) => {
            if(this.graphSettings.colourByMeasure) {
                let measureLookupIndex = this.renderAllMeasures ? idx : this.yAxisIndex;
                return this.colourScale(this.measuresDictionary.Value(this.measures[measureLookupIndex])).toString();
            }
            else {
                return this.colourScale(this.visualGroupByDictionary.Value(d.values[0].visualGroupBy)).toString();
            }
        })
        */
        .attr("stroke-width", 1.5)
        /*
        .attr("class", (d) => {
            if(this.graphSettings.colourByMeasure) {
                return this.lineStyleScale(this.visualGroupByDictionary.Value(d.values[0].visualGroupBy)).toString();
            }
            else {
                let measureLookupIndex = this.renderAllMeasures ? idx : this.yAxisIndex;
                return this.lineStyleScale(this.measuresDictionary.Value(this.measures[measureLookupIndex])).toString();
            }
        })
        */
        .transition()
        .duration(500)
        .attr("d", function (d) {
            //console.log("debug", thisObject.yScale(d["yValues"+thisObject.yAxisAlignment][thisObject.renderAllMeasures ? idx : thisObject.yAxisIndex]));
            let yIndex;
            if(thisObject.parentGraph.parentVisual.trellisByMeasure) yIndex = 0;
            else if(thisObject.renderAllMeasures) yIndex = idx;
            else yIndex = thisObject.yAxisIndex;
                return d3.line<ILineChartRow>()
                .x(function (d) { return thisObject.parentGraph.xAxis.xScale(d.xValue); })
                .y(function (d) { 
                    //return thisObject.yScale(+d["yValues"+thisObject.yAxisAlignment][thisObject.renderAllMeasures ? idx : thisObject.yAxisIndex]);
                    //let yIndex;
                    //if(thisObject.parentGraph.parentVisual.trellisByMeasure) yIndex = 0;
                    //else if(thisObject.renderAllMeasures) yIndex = idx;
                    //else yIndex = thisObject.yAxisIndex;
                    return thisObject.yScale(+d["yValues"+thisObject.yAxisAlignment][yIndex]);
                 })
                 (d.values.filter(val => {return val["yValues"+thisObject.yAxisAlignment][yIndex] != null}))
                 //(d.values)
                
        }
        );



    })


}

private GetTickFormatString(): string {
    let formatString: string;
    //console.log("data types",this.parentGraph.dataTypes)
    try {
        //console.log("dt", this.parentGraph.parentVisual.dataTypes)
        //console.log(this.parentGraph.parentVisual.graphSettings)
        if(this.parentGraph.parentVisual.trellisByMeasure) {

            formatString = this.parentGraph.parentVisual.dataTypes.find(dt => dt.measure == this.parentGraph.nestedData[0].values[0].trellisBy).dataType;
            //formatString = this.parentGraph.dataTypes[0].dataType;
        }
        else if(!this.parentGraph.parentVisual.graphSettings.enableMultipleYAxes)
        {
            formatString = this.parentGraph.parentVisual.dataTypes.find(dt => dt.measure == this.parentGraph.parentVisual.measuresAll[this.yAxisIndex]).dataType;
            //formatString = this.parentGraph.dataTypes[this.yAxisIndex].dataType;

        }
        else {
            //console.log("123")
            //console.log("this.parent")
            formatString = this.parentGraph.parentVisual.dataTypes.find(dt => dt.measure == this.measures[this.yAxisIndex]).dataType;
        }
        if(formatString == null) {
            formatString = "0";
        }
    }
    catch(ex){
        console.log(ex)
    }
    //let formatStringD3 = formatString == "0.00%;-0.00%;0.00%" ? ",.0%" : "~s";
    let formatStringD3;
    if(formatString.indexOf("%") != -1) formatStringD3 = ",.0%";
    else formatStringD3 = "~s";
    //console.log("foramt string", formatString)
    return formatStringD3;
}

private ShowSliders(): void {
    console.log("showing sliders");
}

private HideSliders(): void {
console.log("hiding sliders");
}

}