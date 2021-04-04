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
import { VisualSettings } from "./settings";
import * as d3 from 'd3';
import { ValidateData } from "./dataValidation";
import { GetDistinctValues, InitializeLineByColourBy, GetColourString, GetYValues } from "./supportingFunctions";
//import { ILineChartRow } from "./interfaces";
//import * as d3Slider from "./d3Slider";
import { VerticalRangeSlider } from "./rangeSlider"
import { Visual } from "./visual"
import { YAxis } from "./yAxis";
import {Left, Right, Colour, LineStyle } from "./constants";
import { XAxis } from "./xAxis";
import { Legend } from "./legend";
import { LineLabel } from "./lineLabel";
import { keys } from "d3";
 
interface ITooltipData {
    tooltipValues: number[],
    tooltipCustomValues: number | string [],
    tooltipYCoordinates: number[]
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

interface IBounds {
    top: number,
    right: number,
    bottom: number,
    left: number
}

interface IDataType {
    measure: string,
    dataType: string
}

export class Graph {
    //private parentContainer: d3.Selection<HTMLDivElement, any, HTMLDivElement, any>;
    public parentVisual: Visual;
    public width: number;
    public height: number;
    public margin: IMargin;
    public trellisIndex: number;
    public nestedData: INestedData[];

    public svg: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    public legendContainer: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    public legendTrellis: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    public legendColour: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    public legendLineStyle: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    public legendColourPicker: d3.Selection<SVGGElement, any, HTMLDivElement, any>;

    public colourScale: d3.ScaleOrdinal<string, unknown>;
    public lineStyleScale: d3.ScaleOrdinal<string, unknown>;
    //public xScale;
    public xAxis: XAxis;

    public yAxes: YAxis[];

    private nextColourLegendItemX: number;
    private nextLineStyleLegendItemX: number;

    private graphMouseOverHandler: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    private tooltipContainer: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    private tooltipLine: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    private tooltipValuesContainer: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    private graphAreaLeftAbsoluteBound: number;
    private graphAreaTopAbsoluteBound: number;

    private tooltipLabels: d3.Selection<SVGGElement, any, HTMLDivElement, any>[];
    private tooltipBackground: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    private tooltipPoints: d3.Selection<SVGGElement, any, HTMLDivElement, any>[];
    private tooltipTopLabel: d3.Selection<SVGGElement, any, HTMLDivElement, any>;

    private tooltipCategoryValue: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    private tooltipDivider: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    private tooltipMeasures: string[];
    private tooltipValues: d3.Selection<SVGGElement, any, HTMLDivElement, any>[];
    private tooltipCustomValues: d3.Selection<SVGGElement, any, HTMLDivElement, any>[];
    private tooltipNearestLine;

    private maxLabelWidth: number;
    private maxValueWidth: number;
    private tooltipMarginVertical: number;
    private tooltipMarginHorizontal: number;
    private tooltipValuesContainerWidth: number;
    private tooltipValuesContainerHeight: number;

    private tooltipLineByValues: string[];
    private selectedTooltipLineByValue;
    private selectedTooltipXValue;
    private selectedTooltipValueLabel: d3.Selection<SVGGElement, any, HTMLDivElement, any>;

    private colourPickerContext;
    public trellisValue;

    private legend: Legend;
    public graphBounds: IBounds;
    private lineLabels: LineLabel[];
    //public legendContainer;
    //public legendColourRow;
    //public legendLineStyleRow;
    public dataTypes: IDataType[];

    constructor(parentVisual: Visual, width: number, height: number, margin: IMargin, trellisIndex: number, trellisValue: string | number, dataTypes: IDataType[]){
        this.parentVisual = parentVisual;
        this.width = width;
        this.height = height;
        this.margin = margin;
        this.trellisIndex = trellisIndex;
        this.colourScale = parentVisual.colourScale;
        this.lineStyleScale = parentVisual.lineStyleScale;
        this.nestedData = parentVisual.nestedData[trellisIndex];

        this.colourPickerContext = 0;

        this.yAxes = [];
        this.nextColourLegendItemX = 0;
        this.nextLineStyleLegendItemX = 0;

        this.tooltipLabels = [];
        this.tooltipPoints = [];
        //to include handling of bad data with multiple values for a distinct x value at a later time.. 

        this.tooltipMeasures = this.parentVisual.trellisByMeasure ? [trellisValue as string]: this.parentVisual.measuresLeft.concat(this.parentVisual.measuresRight);
        
        this.tooltipValues = [];
        this.tooltipCustomValues = [];
        this.tooltipLineByValues = this.nestedData.map(grouping => grouping.key);
        this.selectedTooltipLineByValue = this.tooltipLineByValues[0];
        

        this.maxLabelWidth = 0;
        this.maxValueWidth = 0;
        this.tooltipMarginVertical = 15;
        this.tooltipMarginHorizontal = 10;

        this.trellisValue = trellisValue;
        this.graphBounds = {top: 0, right: width, bottom: height, left: 0};
        this.lineLabels = [];
        this.dataTypes = dataTypes;

        this.initGraph();
    }

    private initGraph(): void {
        let thisObject = this;

        this.svg = this.parentVisual.graphContainers[this.trellisIndex]
        .append("svg")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + this.margin.left + "," + this.margin.top + ")");

        //Mouseover handler - event added last
        this.graphMouseOverHandler = this.svg.append("rect")
        .attr("width", this.width)
        .attr("height", this.height)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .attr("class", "mouseoverHandler");

        this.graphAreaLeftAbsoluteBound = this.graphMouseOverHandler.node().getBoundingClientRect().x;
        this.graphAreaTopAbsoluteBound = this.graphMouseOverHandler.node().getBoundingClientRect().y;
        
 
        if(this.parentVisual.legendByTrellis) {
        //Legend
        this.legendContainer = this.svg
        .append("g")
        .attr("transform",
        "translate(0, -25)");

        if(this.parentVisual.trellisByMeasure) {
            let graphLegendTitle = "";
            let legendType = this.parentVisual.graphSettings.colourByMeasure ? Colour : LineStyle;
            let trellisMeasures = [this.parentVisual.measuresAll[this.trellisIndex]];
            let categoryName = "MODEL_MEASURE";
            this.legend = new Legend(this.parentVisual, this.width, 20, this.legendContainer, graphLegendTitle, trellisMeasures, trellisMeasures, trellisMeasures, this.parentVisual.measuresDictionary, legendType, false, categoryName);
        }
        else {
       //Legend Data
       let graphLegendTitle = "";
       //let lineByValue = parentVisual.
       if(this.nestedData.length == 1 || (this.parentVisual.lineByCategoryName.charAt(this.parentVisual.lineByCategoryName.length - 1) == "s")) {
           graphLegendTitle = this.parentVisual.lineByCategoryName;
       }
       else {
           graphLegendTitle = this.parentVisual.lineByCategoryName+"s";
       }

       let legendValuesAll = this.nestedData.map((data) => { return { lineBy: data.key, visualGroupBy: data.values[0].visualGroupBy} });
       let legendValuesGrouped: {visualGroupBy, lineBy: string []}[] = [];
       legendValuesAll.forEach((val) => {
           let valueIdx = legendValuesGrouped.findIndex((grpVal) => { return grpVal.visualGroupBy == val.visualGroupBy })
           if(valueIdx == -1) {
               legendValuesGrouped.push({visualGroupBy: val.visualGroupBy, lineBy: [val.lineBy]})
           }
           else {
               if(legendValuesGrouped[valueIdx].lineBy.indexOf(val.lineBy) == -1) {
                   legendValuesGrouped[valueIdx].lineBy.push(val.lineBy);
               }
           }
       });
       let legendValuesDisplayNames = legendValuesGrouped.map(groupedValue => groupedValue.lineBy.join(" | "));
       
       let legendValues = [];
       this.nestedData.forEach((data) => {
           let legendValue = data.values[0].visualGroupBy;
           if(legendValues.indexOf(legendValue) == -1) {
               legendValues.push(legendValue);
           }
       })

       let legendTooltips;
       if((this.parentVisual.legendLineByCategoryName == this.parentVisual.legendVisualGroupingByCategoryName) || (this.parentVisual.legendVisualGroupingByCategoryName == this.parentVisual.trellisByCategoryName)) {
           legendTooltips = legendValuesDisplayNames;
       }
       else {
           legendTooltips = [];
           legendValuesDisplayNames.forEach((displayName, idx) => {
               let tooltipString = displayName + " (" + this.parentVisual.legendVisualGroupingByCategoryName + ": " + legendValues[idx] + ")";
               legendTooltips.push(tooltipString);
           })
       }
       let legendType = this.parentVisual.graphSettings.colourByMeasure ? LineStyle : Colour;
       let categoryName = this.parentVisual.visualGroupByCategoryName;
       this.legend = new Legend(this.parentVisual, this.width, 30, this.legendContainer, graphLegendTitle, legendValues, legendValuesDisplayNames, legendTooltips, this.parentVisual.visualGroupByDictionary, legendType, true, categoryName)
        }
 
        }

        //console.log("trellis valiue: ", this.trellisValue)

        //Trellis title
        let trellisTitleContainer = this.svg
        .append("g")
        .attr("transform",
        "translate(0, -8)");
        
        if(this.trellisValue != null && this.parentVisual.graphSettings.showTrellisTitle) {
            let trellisCategory = this.parentVisual.trellisByCategoryName == null ? "" : this.parentVisual.trellisByCategoryName + ": ";
            let trellisValueLabel = trellisCategory + this.trellisValue;

            trellisTitleContainer
            .append("text")
            .attr("class", "legendText")
            .text(trellisValueLabel);
        }


        //X-Axis
        this.xAxis = new XAxis(thisObject);

        //let yLeftCount = this.parentVisual.data[0].yValuesLeft.length;
        //let yRightCount = this.parentVisual.data[0].yValuesRight.length;
        let yLeftCount = this.nestedData[0].values[0].yValuesLeft.length;
        let yRightCount = this.nestedData[0].values[0].yValuesRight.length;
        //console.log("key: ", this.nestedData)
        //Y Axis, Sliders, and Lines - Left Axis
        if (yLeftCount !== 0) {
            if(!this.parentVisual.graphSettings.enableMultipleYAxes || (this.parentVisual.trellisByMeasure)) {
                thisObject.yAxes.push(new YAxis(thisObject, 0, true, Left))
            }
            else {
                this.parentVisual.data[0].yValuesLeft.forEach(function (value, idx) {
                    thisObject.yAxes.push(new YAxis(thisObject, idx, false, Left));
                });
            }
        }

        //Y Axis, Sliders, and Lines - Right Axis
        if (yRightCount !== 0) {
            if(!this.parentVisual.graphSettings.enableMultipleYAxes || this.parentVisual.trellisByMeasure) {
                thisObject.yAxes.push(new YAxis(thisObject, 0, true, Right))
            }
            else {
                this.parentVisual.data[0].yValuesRight.forEach(function (value, idx) {
                    thisObject.yAxes.push(new YAxis(thisObject, idx, false, Right));
                });
            }
        }

        //line labels
        if(this.parentVisual.graphSettings.showLineLabels) {
            /*
            let allLines = this.svg.selectAll('path')
            .filter(function() {
                return d3.select(this).attr("chartLine") == "1"; // filter by single attribute
              });
            allLines.each((line, idx) => {

                this.lineLabels.push(new LineLabel(this, line["key"], 0, idx*10))
            })
            */
           this.nestedData.forEach((lineByData, idx) => {
                this.lineLabels.push(new LineLabel(this, lineByData.key, 0, 10 + idx * 15));
           })
        }


        //Tooltips
        if (this.parentVisual.graphSettings.enableTooltips) {
      //Tooltip container
      this.tooltipContainer = this.svg.append("g")
      .attr("desc", "tooltipContainer")
      .attr("width", this.width)
      .attr("pointer-events", "none")
      .attr("transform", "translate(0,0)")
      .style("visibility", "hidden");

      //Tooltip line
      this.tooltipLine = this.tooltipContainer.append("rect")
      .attr("width", 1)
      .attr("height", this.height)
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("fill", "grey");

      
      if(this.parentVisual.trellisByMeasure) {
        let tooltipPoint = this.tooltipContainer.append("circle")
        .attr("r", 3)
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("fill", "grey");        

        this.tooltipPoints.push(tooltipPoint);
      }
      else {
        this.parentVisual.measuresAll.forEach(() => {
            let tooltipPoint = this.tooltipContainer.append("circle")
            .attr("r", 3)
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("fill", "grey");        
    
            this.tooltipPoints.push(tooltipPoint);
    
          });
      }

      //Tooltip values container
      this.tooltipValuesContainer = this.tooltipContainer.append("g")
      .attr("cx", 0)
      .attr("cy", 0);
      
      //console.log(this.parentVisual.trellisByMeasure)

       this.tooltipValuesContainerHeight = 
       (this.parentVisual.trellisByMeasure) ?
       50 + this.parentVisual.tooltipMembers.length * 25
       : 25 + this.parentVisual.measuresAll.length * 25 + this.parentVisual.tooltipMembers.length * 25;


       this.tooltipBackground = this.tooltipValuesContainer.append("rect")
      .attr("width", 50)
      .attr("height", this.tooltipValuesContainerHeight)
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("fill", "#e0e0e0");

      //Top Label area
      /*
      this.tooltipValuesContainer.append("rect")
      .attr("width", 26)
      .attr("height", 20)
      //.attr("cx", 0)
      //.attr("cy", 0)
      .attr("fill", "#e0e0e0")
      .attr("transform",
      "translate(0, -19)");
      */
      //Top Label text
      this.tooltipTopLabel = this.tooltipValuesContainer.append("text")
      .attr("height", 25)
       .attr("class", "tooltipCategoryLabelText")
       .attr("transform",
       "translate(10, -5)")
       .text("");
      
      //Category Label
       let categoryLabel = this.tooltipValuesContainer.append("text")
       .attr("height", 25)
       .attr("class", "tooltipCategoryLabelText")
       .attr("transform",
       "translate(" + this.tooltipMarginHorizontal +", "+ this.tooltipMarginVertical +")")
       .text(this.parentVisual.xCategoryName);
       //.text(this.parentVisual.xCategoryName + " (" + this.parentVisual.lineByCategoryName + ")");

       this.maxLabelWidth = categoryLabel.node().getBoundingClientRect().width;

       //Tooltip divider
       this.tooltipDivider = this.tooltipValuesContainer.append("rect")
       .attr("height", 1)
       .attr("width", 25)
       .attr("fill", "black")
       .attr("transform",
       "translate(" + this.tooltipMarginHorizontal +", "+ 21 +")");

      //Draw tooltip labels, capturing the width of the widest one

      this.tooltipMeasures.forEach((measure, idx) => {
          let tooltipItemY = this.tooltipMarginVertical + idx * 25 + 25;
          let tooltipLabel = this.tooltipValuesContainer.append("text")
          //.attr("width", 100)
          .attr("height", 25)
          //.attr("cx", 0)
          //.attr("cy", tooltipItemY)
          .attr("class", "tooltipLabelText")
          .attr("transform",
          "translate(" + this.tooltipMarginHorizontal +", "+ tooltipItemY +")")
          .text(measure);

          let labelWidth = tooltipLabel.node().getBoundingClientRect().width;
          if (labelWidth > this.maxLabelWidth) {
           this.maxLabelWidth = labelWidth;
          }
      });

      //Draw user-defined tooltip labels, capturing the width of the widest one
      let userDefinedTooltipStartingHeight = 25 + this.tooltipMeasures.length * 25 + this.tooltipMarginVertical
      this.parentVisual.tooltipMembers.forEach((tooltipUserDefinedMember, idx) => {
        let tooltipItemY = userDefinedTooltipStartingHeight + idx * 25;
        let tooltipLabel = this.tooltipValuesContainer.append("text")
        //.attr("width", 100)
        .attr("height", 25)
        //.attr("cx", 0)
        //.attr("cy", tooltipItemY)
        .attr("class", "tooltipLabelText")
        .attr("transform",
        "translate(" + this.tooltipMarginHorizontal +", "+ tooltipItemY +")")
        .text(tooltipUserDefinedMember.tooltipMemberName);

        let labelWidth = tooltipLabel.node().getBoundingClientRect().width;
        if (labelWidth > this.maxLabelWidth) {
         this.maxLabelWidth = labelWidth;
        }
      });


      //Draw tooltip values, capturing the width of the widest one

      let tooltipItemX = this.maxLabelWidth + this.tooltipMarginHorizontal * 2;

      //Category value
      this.tooltipCategoryValue = this.tooltipValuesContainer.append("text")
      .attr("height", 25)
      .attr("class", "tooltipCategoryValueText")
      .attr("transform",
      "translate(" + tooltipItemX +", "+ this.tooltipMarginVertical +")");
      this.maxValueWidth = this.tooltipCategoryValue.node().getBoundingClientRect().width;
      
      //Measure values
      this.tooltipMeasures.forEach((value, idx) => {
       let tooltipItemY = this.tooltipMarginVertical + idx * 25 + 25;
       let tooltipValue = this.tooltipValuesContainer.append("text")
       .attr("height", 25)
       .attr("class", "tooltipValueText")
       .attr("transform",
       "translate(" + tooltipItemX +", "+ tooltipItemY +")")
       //.text(value);

       let valueWidth = tooltipValue.node().getBoundingClientRect().width;
       if (valueWidth > this.maxValueWidth) {
           this.maxValueWidth = valueWidth;
       }
       this.tooltipValues.push(tooltipValue);
      });

      //User-defined tooltip values
      this.parentVisual.tooltipMembers.forEach((tooltipUserDefinedMember, idx) => {
        let tooltipItemY = userDefinedTooltipStartingHeight + idx * 25;
        let tooltipValue = this.tooltipValuesContainer.append("text")
        .attr("height", 25)
        .attr("class", "tooltipValueText")
        .attr("transform",
        "translate(" + tooltipItemX +", "+ tooltipItemY +")")
        //.text(value);
 
        let valueWidth = tooltipValue.node().getBoundingClientRect().width;
        if (valueWidth > this.maxValueWidth) {
            this.maxValueWidth = valueWidth;
        }
        this.tooltipCustomValues.push(tooltipValue);
      });
      
      this.tooltipBackground.attr("width", this.maxLabelWidth + this.maxValueWidth + this.tooltipMarginHorizontal * 3);

       //Graph mouseover handler events
       this.graphMouseOverHandler
       .on("mouseover", () => {
           this.OnGraphMouseOver(d3.event.pageX, d3.event.pageY);
       })
       .on("mousemove", () => {
           this.OnGraphMouseMove(d3.event.pageX, d3.event.pageY);
       })
       .on("mouseout", () => {
           this.OnGraphMouseOut();
       })
       .on("click", () => {
           if (this.tooltipNearestLine) {

            //this.SelectLine(this.tooltipNearestLine);
            this.parentVisual.SelectLines(this.tooltipNearestLine);

           }
       });
        }

    }

    public HighlightLine(line: string) {
        let highlightedLine = this.svg.selectAll('path')
        .filter(function() {
            return (d3.select(this).attr("chartLine") == "1" && d3.select(this).attr("lineByValue") == line); // filter by single attribute
          });
        let nonHighlightedLines = this.svg.selectAll('path')
        .filter(function() {
            return (d3.select(this).attr("chartLine") == "1" && d3.select(this).attr("lineByValue") != line); // filter by single attribute
          });

          highlightedLine
          .transition().duration(200)
          .attr("stroke-width", 2.5)
          .style("opacity", 1.0);

          nonHighlightedLines
          .transition().duration(200)
          .attr("stroke-width", 1.5)
          .style("opacity", 0.35);

    }

    public SelectLine(line: string) {

        let thisObject = this;
        //let lineByDataType = typeof(line);
        //let filterApplied = line !== null ? this.parentVisual.applyFilter(line): false;
        let filterValues = this.parentVisual.filterValues;
        //console.log("attempting to select line: ", line)
        let allLines = this.svg.selectAll('path')
        .filter(function() {
            return d3.select(this).attr("chartLine") == "1"; // filter by single attribute
          });

          //console.log("all lines: ", allLines)
          /*
        let allLineLegendItems = this.legendContainer.selectAll('text')
        .filter(function() {
            return d3.select(this).attr("isLineLegend") == "1"; // filter by single attribute
          });
          */

        //if filter is empty, reset all line styles
        if (filterValues.length == 0) {

            allLines
            .transition().duration(600)
            .attr("stroke-width", 1.5)
            .style("opacity", 1.0);
            /*
            allLineLegendItems
            .transition().duration(600)
            .attr("font-weight", "normal");
            */

        }
        //otherwise adjust line styles according to items in filter
        else {
            let selectedLines = allLines.filter(function() {
                let lineValue = d3.select(this).attr("lineByValue");
                return filterValues.indexOf(lineValue) !== -1;
              });

            let nonSelectedLines = allLines.filter(function() {
                let lineValue = d3.select(this).attr("lineByValue");
                return filterValues.indexOf(lineValue) == -1;
              });

              //console.log("trellis graph", this.trellisIndex, "selected lines", selectedLines, "non selected lines", nonSelectedLines)
              /*
            let selectedLineLegendItems = allLineLegendItems.filter(function() {
                let lineValue = d3.select(this).attr("lineByValue");
                return filterValues.indexOf(lineValue) !== -1;
              });

            let nonSelectedLineLegendItems = allLineLegendItems.filter(function() {
                let lineValue = d3.select(this).attr("lineByValue");
                return filterValues.indexOf(lineValue) == -1;
              });
              */

            selectedLines
            .transition().duration(600)
            .attr("stroke-width", 2.5)
            .style("opacity", 1.0);

            nonSelectedLines
            .transition().duration(600)
            .attr("stroke-width", 1.5)
            .style("opacity", 0.35);

            /*
            selectedLineLegendItems
            .transition().duration(600)
            .attr("font-weight", "bold");

            nonSelectedLineLegendItems
            .transition().duration(600)
            .attr("font-weight", "normal");
            */
        };

        /*
        let filterApplied = this.parentVisual.applyFilter(line);

        let lineByValue = line;
        let selectedLines = this.svg.selectAll('path')
        .filter(function() {
            return d3.select(this).attr("lineByValue") == lineByValue; // filter by single attribute
          });
        
        if (filterApplied) {
            selectedLines
            .transition().duration(600)
            .attr("stroke-width", 2.5);
        }
        else {
            selectedLines
            .transition().duration(600)
            .attr("stroke-width", 1.5);
        }

        // set line opacity
        let filterItems = this.parentVisual.visualFilter.values;

        let allLines = this.svg.selectAll('path')
        .filter(function() {
            return d3.select(this).attr("chartLine") == "1"; // filter by single attribute
          });

        allLines
        .transition().duration(600)
        .style("opacity", 1.0);

        if (filterItems.length != 0) {
            let nonSelectedLines = allLines.filter(function() {
                //return 
                let lineByValue = d3.select(this).attr("lineByValue");
                console.log("aaa ", lineByValue);
                if (filterItems.indexOf(Number(lineByValue)) == -1) {
                    return true;
                }
                else {
                    return false;
                }
            });
            nonSelectedLines
            .transition().duration(600)
            .style("opacity", 0.25);
            //console.log(nonSelectedLines);
        }
        */
    }

    private CalcRelativeMousePosition(absX: number, absY: number): number[] {
        let relativePosition: number[] = [];
        relativePosition.push(absX - this.graphAreaLeftAbsoluteBound);
        relativePosition.push(absY - this.graphAreaTopAbsoluteBound);
        return relativePosition;
    }

    private CalcTooltipX (relativeMouseXPosition: number): number {
        //let nearestXValue = Math.round(this.xAxis.xScale.invert(relativeMouseXPosition));
        //let tooltipX = this.xAxis.xScale(nearestXValue);
        //console.log(nearestXValue)
        let nearestXValue = this.FindNearestX(Math.round(this.xAxis.xScale.invert(relativeMouseXPosition)));
        //return tooltipX;
        //console.log("cursor value: ",Math.round(this.xAxis.xScale.invert(relativeMouseXPosition)))
        //console.log(nearestXValue)
        return nearestXValue;
    }

    private CalcTooltipY (relativeMouseYPosition: number, xValue: number): ITooltipData {
        //step 1 - find nearest line (somewhat ugly loop implementation)
        let nearestLinePosition;
        let nearestLine;

        this.nestedData.filter((data) => { return data.values.map(val => val.xValue).indexOf(xValue) != -1 })
        .forEach((linesData) => {
            let dataByXValue = linesData.values.find((value) => { return value.xValue == xValue });
            //console.log("filtered data ",dataByXValue);

            dataByXValue.yValuesLeft.forEach((yLeft, idx) => {
                    let yScale = this.parentVisual.graphSettings.enableMultipleYAxes ? this.yAxes[idx].yScale : this.yAxes[0].yScale;
                    let elementYPosition = yScale(yLeft);

                    if(nearestLinePosition){
                        if(Math.abs(relativeMouseYPosition - nearestLinePosition) > Math.abs(relativeMouseYPosition - elementYPosition)) {
                            nearestLinePosition = elementYPosition;
                            nearestLine = linesData.key;
                        }
                    }
                    else {
                        nearestLinePosition = elementYPosition;
                        nearestLine = linesData.key;
                    }

                });
                dataByXValue.yValuesRight.forEach((yRight, idx) => {
                    let yAxisIdx = this.parentVisual.graphSettings.enableMultipleYAxes ? dataByXValue.yValuesLeft.length : dataByXValue.yValuesLeft.length + idx;
                    let yScale = this.yAxes[yAxisIdx].yScale;
                    let elementYPosition = yScale(yRight);

                    if(nearestLinePosition){
                        if(Math.abs(relativeMouseYPosition - nearestLinePosition) > Math.abs(relativeMouseYPosition - elementYPosition)) {
                            nearestLinePosition = elementYPosition;
                            nearestLine = linesData.key;
                        }
                    }
                    else {
                        nearestLinePosition = elementYPosition;
                        nearestLine = linesData.key;
                    }

                });


        });

        this.tooltipNearestLine = nearestLine; 

        //step 2 - get line value(s)
        let tooltipYData: ITooltipData = {tooltipValues: [], tooltipCustomValues: [], tooltipYCoordinates: []};

        let lineData = this.nestedData.find((member) => { return member.key == nearestLine }).values.find((member) => { return member.xValue == xValue });
        
        lineData.yValuesLeft.forEach((yLeft, idx) => { 
            let yScale = this.parentVisual.graphSettings.enableMultipleYAxes ? this.yAxes[idx].yScale : this.yAxes[0].yScale;
            let elementYPosition = yScale(yLeft);

            tooltipYData.tooltipValues.push(yLeft);
            tooltipYData.tooltipYCoordinates.push(elementYPosition);
        });
        lineData.yValuesRight.forEach((yRight, idx) => {
            let yAxisIdx = this.parentVisual.graphSettings.enableMultipleYAxes ? lineData.yValuesLeft.length : lineData.yValuesLeft.length + idx;
            let yScale = this.yAxes[yAxisIdx].yScale;
            let elementYPosition = yScale(yRight);

            tooltipYData.tooltipValues.push(yRight);
            tooltipYData.tooltipYCoordinates.push(elementYPosition);
        });

        //custom values
        tooltipYData.tooltipCustomValues = this.nestedData.find((data) => {return data.key == nearestLine}).values.find((value) => {return value.xValue == xValue})["tooltipData"];
        
        //console.log("tooltip data: ", tooltipYData);
        return tooltipYData;

        //console.log("nearest line: "+nearestLine);
        //return nearestLine;
        //return lineMeasureValues;
    }
    
    private GetClosest(val1: number, val2: number, target: number): number {
        if (target - val1 >= val2 - target)  {
            return val2;       
        }
        else {
            return val1;  
        }
    }

    private FindNearestX(cursorXValue: number): number {
        //console.log("target: ", cursorXValue, "values array: ", this.xAxis.xValues);
        let xValuesArray = this.xAxis.xValues;
        let xValuesCount = xValuesArray.length;

        //corner cases
        if(cursorXValue <= xValuesArray[0]) {
            return xValuesArray[0];
        }
        if(cursorXValue >= xValuesArray[xValuesCount - 1]) {
            return xValuesArray[xValuesCount - 1];
        }
        //binary search implementation
        let i: number = 0;
		let j: number = xValuesCount;
		let mid: number = 0; 
        while (i < j) { 
            mid = Math.floor((i + j) / 2); 
  
            if (xValuesArray[mid] == cursorXValue) {
                //console.log("is mid", mid)
                return xValuesArray[mid]; 
            }             
  
            /* If target is less than xValuesArrayay element, 
               then search in left */
            if (cursorXValue < xValuesArray[mid]) { 
         
                // If target is greater than previous 
                // to mid, return closest of two 
                if (mid > 0 && cursorXValue > xValuesArray[mid - 1])  {
                    return this.GetClosest(xValuesArray[mid - 1], xValuesArray[mid], cursorXValue); 
                }
                  
                /* Repeat for left half */
                j = mid;               
            } 
  
            // If target is greater than mid 
            else { 
                if (mid < xValuesCount - 1 && cursorXValue < xValuesArray[mid + 1])  {
                    return this.GetClosest(xValuesArray[mid], xValuesArray[mid + 1], cursorXValue);                 
                }
                    
                i = mid + 1; // update i 
            } 
        } 
  
        // Only single element left after search 
        //console.log("mid: ", mid, "mid value: ",xValuesArray[mid])
        return xValuesArray[mid]; 

    }

    private CalculateTooltipValues(nearestXValue: number, tooltipValues: number[], tooltipCustomValues: number | string [])
    {
        let xValue: string;
        if(this.parentVisual.xCategoryIsDate) {
            
            let xValDate = new Date(0);
            let utcSeconds = nearestXValue as number;
            xValDate.setUTCSeconds(utcSeconds);
             let xValDateString = xValDate.getDate().toString() + "/" + (xValDate.getMonth() + 1).toString() + "/" + xValDate.getFullYear().toString();
            
           xValue = xValDateString
        }
        else {
            xValue = nearestXValue.toString();
        }
        //Category values
        //this.tooltipCategoryValue.text(nearestXValue + " (" + this.selectedTooltipLineByValue + ")");
        this.tooltipCategoryValue.text(xValue);
        this.maxValueWidth = this.tooltipCategoryValue.node().getBoundingClientRect().width;

        //let selectedTooltipLineData = this.nestedData.find(element => element.key == this.selectedTooltipLineByValue).values.find(element => element.xValue == nearestXValue);

        //let dataValues = selectedTooltipLineData.yValuesLeft.concat(selectedTooltipLineData.yValuesRight);
         

        this.tooltipValues.forEach((tooltipValueElement, idx) => {
            tooltipValueElement.text(tooltipValues[idx]);

            let valueWidth = tooltipValueElement.node().getBoundingClientRect().width;
            if (valueWidth > this.maxValueWidth) {
                this.maxValueWidth = valueWidth;
            }
        });

        this.tooltipCustomValues.forEach((tooltipCustomValueElement, idx) => {
            tooltipCustomValueElement.text(tooltipCustomValues[idx]);

            let valueWidth = tooltipCustomValueElement.node().getBoundingClientRect().width;
            if (valueWidth > this.maxValueWidth) {
                this.maxValueWidth = valueWidth;
            }
        });

    }

    private MoveTooltipPoints(nearestXValue: number, tooltipYCoordinates: number[]) {
        this.tooltipPoints.forEach((point, idx) => {
            point
            .attr("cx", this.xAxis.xScale(nearestXValue))
            .attr("cy", tooltipYCoordinates[idx])
        })
    }

    private MoveTooltip(mousePageXPosition: number, mousePageYPosition: number) {
        let relativeMousePosition = this.CalcRelativeMousePosition(mousePageXPosition, mousePageYPosition);
        
        let graphXMid = this.xAxis.xScale.range()[1] / 2;
        //console.log("mouse position: ", relativeMousePosition, "graph x max: ", graphXMid);

        let nearestXValue = this.CalcTooltipX(relativeMousePosition[0]);
        let tooltipXPosition = this.xAxis.xScale(nearestXValue);
        //console.log("precalc debug")
        let tooltipYData = this.CalcTooltipY(relativeMousePosition[1], nearestXValue);
        //console.log("tooltip y data: ", tooltipYData);
        //console.log("artem test, ", tooltipYData);
        //let tooltipCustomData = this.nestedData.find((data) => {return data.key == nearestX})

        //move tooltip line
        this.tooltipLine
        .attr("transform",
        "translate("+ tooltipXPosition +", 0)");

        this.tooltipTopLabel.text(this.tooltipNearestLine);

        //recalculate tooltip values
        this.CalculateTooltipValues(nearestXValue, tooltipYData.tooltipValues, tooltipYData.tooltipCustomValues);

        //Move tooltip points
        this.MoveTooltipPoints(nearestXValue, tooltipYData.tooltipYCoordinates);
        
        //Resize background container
        this.tooltipValuesContainerWidth = this.maxLabelWidth + this.maxValueWidth + this.tooltipMarginHorizontal * 3;
        this.tooltipBackground.attr("width", this.tooltipValuesContainerWidth);

        //Resize divider line
        this.tooltipDivider.attr("width", this.tooltipValuesContainerWidth - this.tooltipMarginHorizontal * 2);

        //Calculate new values container position
        //let proposedXPosition = Math.max(tooltipXPosition + 10, relativeMousePosition[0]);
        let proposedYPosition = relativeMousePosition[1];

        //let tooltipValuesXPosition = (this.tooltipValuesContainerWidth + proposedXPosition) <= this.width ? proposedXPosition : (tooltipXPosition - this.tooltipValuesContainerWidth - 10);
        let tooltipValuesXPosition = relativeMousePosition[0] <= graphXMid ? tooltipXPosition + 10 : tooltipXPosition - this.tooltipValuesContainerWidth - 10;
        let tooltipValuesYPosition = (this.tooltipValuesContainerHeight + proposedYPosition) <= this.height ? proposedYPosition : (this.height - this.tooltipValuesContainerHeight)
        
        //move tooltip values container
        this.tooltipValuesContainer
        .attr("transform",
        "translate("+ tooltipValuesXPosition +", " + tooltipValuesYPosition + ")");

    }
    
    public OnGraphMouseOver(mousePageXPosition: number, mousePageYPosition: number) {

        this.tooltipContainer.style("visibility", "visible");
        this.MoveTooltip(mousePageXPosition, mousePageYPosition);

    }

    private OnGraphMouseMove(mousePageXPosition: number, mousePageYPosition: number) {

        this.MoveTooltip(mousePageXPosition, mousePageYPosition);

    }

    public OnGraphMouseOut() {
        this.tooltipContainer.style("visibility", "hidden");
    }

    public IncrementColour(colourIndex: string) {
        //console.log("current range: ", this.colourScale.range());

        let currentRange = this.colourScale.range();
        let indexOriginalList = this.parentVisual.colours.indexOf(currentRange[colourIndex]);

        let indexNextColour = indexOriginalList + 1 === this.parentVisual.colours.length ? 0 : indexOriginalList + 1;
        let nextColour = this.parentVisual.colours[indexNextColour];

        let newRange = currentRange;
        newRange[colourIndex] = nextColour;

        this.parentVisual.colourScale.range(newRange);
        this.parentVisual.update(this.parentVisual.OPTIONS);
    }

    public ResetColours() {
        this.parentVisual.colourScale.range(this.parentVisual.colours);
        this.parentVisual.update(this.parentVisual.OPTIONS);
    }

    public IncrementLineStyle(lineStyleIndex: string) {
        let currentRange = this.lineStyleScale.range();
        let indexOriginalList = this.parentVisual.lineStyles.indexOf(currentRange[lineStyleIndex]);

        let indexNextLineStyle = indexOriginalList + 1 === this.parentVisual.lineStyles.length ? 0 : indexOriginalList + 1;
        let nextLineStyle = this.parentVisual.lineStyles[indexNextLineStyle];

        let newRange = currentRange;
        newRange[lineStyleIndex] = nextLineStyle;

        this.parentVisual.lineStyleScale.range(newRange);
        this.parentVisual.update(this.parentVisual.OPTIONS);
    }

    public ResetLineStyles() {
        this.parentVisual.lineStyleScale.range(this.parentVisual.lineStyles);
        this.parentVisual.update(this.parentVisual.OPTIONS);
    }

    private SetLabelLine(tooltipLineByValue: string) {
        this.selectedTooltipLineByValue = tooltipLineByValue;
        //console.log("selected: ", this.selectedTooltipLineByValue);
        //this.CalculateTooltipValues();
    }


}