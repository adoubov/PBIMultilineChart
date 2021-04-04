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
 
interface ITooltipData {
    tooltipValues: number[],
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
    private trellisValue;

    private legend: Legend;

    //public legendContainer;
    //public legendColourRow;
    //public legendLineStyleRow;

    constructor(parentVisual: Visual, width: number, height: number, margin: IMargin, trellisIndex: number, trellisValue: string | number){
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
        //to include handling of bad data with multiple values for a distinct x value at a later time.. Artem you'd better get around to it..
        this.tooltipMeasures = this.parentVisual.measuresLeft.concat(this.parentVisual.measuresRight);
        this.tooltipValues = [];
        this.tooltipLineByValues = this.nestedData.map(grouping => grouping.key);
        this.selectedTooltipLineByValue = this.tooltipLineByValues[0];
        

        this.maxLabelWidth = 0;
        this.maxValueWidth = 0;
        this.tooltipMarginVertical = 15;
        this.tooltipMarginHorizontal = 10;

        this.trellisValue = trellisValue;

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
        .attr("pointer-events", "all");

        this.graphAreaLeftAbsoluteBound = this.graphMouseOverHandler.node().getBoundingClientRect().x;
        this.graphAreaTopAbsoluteBound = this.graphMouseOverHandler.node().getBoundingClientRect().y;
        
 
        //Legend
        this.legendContainer = this.svg
        .append("g")
        .attr("transform",
        "translate(0, -40)");

        
        let legendTitleWidth = 0;

        //Colours row
        this.legendColour = this.legendContainer
        .append("g")
        .attr("width", this.width - this.margin.left - this.margin.right)
        .attr("height", "12")
        .attr("transform",
        "translate(0, 0)");
        
        let colourLegendTitle = this.legendColour
        .append("text")
        .attr("class", "legendText")
        //.text("Colours:")
        .text(() => {
            if(this.parentVisual.graphSettings.colourByMeasure) {
                if(this.parentVisual.measuresAll.length == 1) {
                    return "Measure:";
                }
                else {
                    return "Measures:";
                }
            }
            else {
               if(this.nestedData.length == 1 || (this.parentVisual.lineByCategoryName.charAt(this.parentVisual.lineByCategoryName.length - 1) == "s")) {
                   return this.parentVisual.lineByCategoryName+":";
               }
               else {
                return this.parentVisual.lineByCategoryName+"s:";
               }
            }
        })
        .on("click", () => {
            this.ResetColours();
        });
        let colourLegendTitleWidth = colourLegendTitle.node().getBoundingClientRect().width;

        //Line Styles row
        this.legendLineStyle = this.legendContainer
        .append("g")
        .attr("width", this.width - this.margin.left - this.margin.right)
        .attr("height", "12")
        .attr("transform",
        "translate(0, 20)")

        let lineStyleLegendTitle = this.legendLineStyle
        .append("text")
        .attr("class", "legendText")
        //.text("Line Styles:");
        .text(() => {
            if(this.parentVisual.graphSettings.colourByMeasure) {
                if(this.nestedData.length == 1 || (this.parentVisual.lineByCategoryName.charAt(this.parentVisual.lineByCategoryName.length - 1) == "s")) {
                    return this.parentVisual.lineByCategoryName+":";
                }
                else {
                 return this.parentVisual.lineByCategoryName+"s:";
                }
            }
            else {
                if(this.parentVisual.measuresAll.length == 1) {
                    return "Measure:";
                }
                else {
                    return "Measures:";
                }
            }
        })
        .on("click", () => {
            this.ResetLineStyles();
        });
        let lineStyleLegendTitleWidth = lineStyleLegendTitle.node().getBoundingClientRect().width;

        legendTitleWidth = Math.max(colourLegendTitleWidth, lineStyleLegendTitleWidth) + 15;

        this.nextColourLegendItemX = legendTitleWidth;
        this.nextLineStyleLegendItemX = legendTitleWidth;
        
        
        //this.legendContainer
        //.attr("transform",
        //"translate(-" + legendTitleWidth + ", -50)");
        


        //colour picker POC
        this.legendColourPicker = this.legendContainer
        .append("g")
        .style("visibility", "hidden");

        
        let legendColourPickerCurrentX = 0;
        let legendColourPickerMargin = 7;
        let legendColourPickerSize = 20;

        this.legendColourPicker
        .append("rect")
        .attr("width", legendColourPickerMargin * 2 +  legendColourPickerSize * this.parentVisual.colours.length)
        .attr("height", legendColourPickerMargin * 2 + legendColourPickerSize)
        .attr("fill", "#E8E8E8")
        //.style("visibility", "hidden")
        .on("mouseout", () => {
            this.legendColourPicker
            .style("visibility", "hidden");
        })

        this.parentVisual.colours.forEach((colour, idx) => {

            let thisObject = this;
            let pickerItemX = idx * legendColourPickerSize + legendColourPickerMargin;
            let pickerItemY = legendColourPickerMargin;

            this.legendColourPicker
            .append("rect")
            .attr("width", legendColourPickerSize)
            .attr("height", legendColourPickerSize)
            .attr("fill", colour)
            .attr("x", pickerItemX)
            .attr("y", pickerItemY)
            //.attr("transform",
            //"translate(" + pickerItemX + ", " + pickerItemY + ")")
            .style("opacity", 0.5)
            .on("click", () => {
                //console.log(this.parentVisual.colourScale.domain());
                //console.log(this.parentVisual.colourScale.range());

                let colourIndex = this.parentVisual.settings.graphSettings.colourByMeasure ? this.parentVisual.measuresDictionary.Value(this.colourPickerContext): this.parentVisual.visualGroupByDictionary.Value(this.colourPickerContext);
                //this.parentVisual.colours[colourIndex] = colour;
                let newColours = this.parentVisual.colourScale.range();
                newColours[colourIndex] = colour;

                this.parentVisual.colourScale.range(newColours);
                this.parentVisual.update(this.parentVisual.OPTIONS);
                //console.log(test)
                //colourPickerContext

            })
            .on("mouseover", function(d) {
                d3.select(this)
                .style("opacity", 1);

                thisObject.legendColourPicker
                .style("visibility", "visible");

            })
            .on("mouseout", function(d) {
                d3.select(this)
                .style("opacity", 0.5);
            })

        })

        //Trellis Label row
        
        this.legendTrellis = this.legendContainer
        .append("g")
        .attr("width", this.width - this.margin.left - this.margin.right)
        .attr("height", "12")
        .attr("transform",
        "translate(0, 40)");

        if(this.trellisValue != null) {
            let trellisValueLabel = this.parentVisual.trellisByCategoryName + ": " + this.trellisValue
            this.legendTrellis
            .append("text")
            .attr("class", "legendText")
            .text(trellisValueLabel);
        }
        

        /*
        this.legendContainer
        .on("mouseout", () => {
            this.legendColourPicker
            .style("visibility", "hidden");
        })
        */

        //let coloursCount = this.parentVisual.colours.length;

        this.xAxis = new XAxis(thisObject);



        let yLeftCount = this.parentVisual.data[0].yValuesLeft.length;
        let yRightCount = this.parentVisual.data[0].yValuesRight.length;

        //Y Axis, Sliders, and Lines - Left Axis
        if (yLeftCount !== 0) {
            if(!this.parentVisual.graphSettings.enableMultipleYAxes) {
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
            if(!this.parentVisual.graphSettings.enableMultipleYAxes) {
                thisObject.yAxes.push(new YAxis(thisObject, 0, true, Right))
            }
            else {
                this.parentVisual.data[0].yValuesRight.forEach(function (value, idx) {
                    thisObject.yAxes.push(new YAxis(thisObject, idx, false, Right));
                });
            }
        }

        //this.AddLegendItem("Colour", "testText", "Black");

        //Draw legend items
        //Colour legend
        if(this.parentVisual.graphSettings.colourByMeasure) {
            this.parentVisual.measuresAll.forEach((measure) => {
                this.AddLegendItem(Colour, measure, this.parentVisual.colourScale(this.parentVisual.measuresDictionary.Value(measure)).toString(), this.parentVisual.measuresDictionary.Value(measure), false)
            })
        }
        else {
            this.nestedData.forEach((data) => {
                this.AddLegendItem(Colour, data.key, this.parentVisual.colourScale(this.parentVisual.visualGroupByDictionary.Value(data.values[0].visualGroupBy)).toString(), this.parentVisual.visualGroupByDictionary.Value(data.values[0].visualGroupBy), true)
            })
        }
        //Line Style legend
        if(this.parentVisual.graphSettings.colourByMeasure) {
            this.nestedData.forEach((data) => {
                this.AddLegendItem(LineStyle, data.key, this.parentVisual.lineStyleScale(this.parentVisual.visualGroupByDictionary.Value(data.values[0].visualGroupBy)).toString(), this.parentVisual.visualGroupByDictionary.Value(data.values[0].visualGroupBy), true)
            })
        }
        else {
            this.parentVisual.measuresAll.forEach((measure) => {
                this.AddLegendItem(LineStyle, measure, this.parentVisual.lineStyleScale(this.parentVisual.measuresDictionary.Value(measure)).toString(), this.parentVisual.measuresDictionary.Value(measure), false)
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

      
      this.parentVisual.measuresAll.forEach(() => {
        let tooltipPoint = this.tooltipContainer.append("circle")
        .attr("r", 3)
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("fill", "grey");        

        this.tooltipPoints.push(tooltipPoint);

      });
      

      //Tooltip values container
      this.tooltipValuesContainer = this.tooltipContainer.append("g")
      .attr("cx", 0)
      .attr("cy", 0);

       this.tooltipValuesContainerHeight = this.parentVisual.measuresAll.length * 25 + 25;


       this.tooltipBackground = this.tooltipValuesContainer.append("rect")
      .attr("width", 50)
      .attr("height", this.tooltipValuesContainerHeight)
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("fill", "#e0e0e0");

      //Top Label area
      this.tooltipValuesContainer.append("rect")
      .attr("width", 26)
      .attr("height", 20)
      //.attr("cx", 0)
      //.attr("cy", 0)
      .attr("fill", "#e0e0e0")
      .attr("transform",
      "translate(0, -19)");
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
      })
      
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

            this.SelectLine(this.tooltipNearestLine);

           }
       });
        }

    }

    private SelectLine(line: string) {

        let thisObject = this;
        let lineByDataType = typeof(line);
        let filterApplied = this.parentVisual.applyFilter(line);
        let filterValues = this.parentVisual.filterValues;

        let allLines = this.svg.selectAll('path')
        .filter(function() {
            return d3.select(this).attr("chartLine") == "1"; // filter by single attribute
          });

        let allLineLegendItems = this.legendContainer.selectAll('text')
        .filter(function() {
            return d3.select(this).attr("isLineLegend") == "1"; // filter by single attribute
          });

        //if filter is empty, reset all line styles
        if (filterValues.length == 0) {

            allLines
            .transition().duration(600)
            .attr("stroke-width", 1.5)
            .style("opacity", 1.0);

            allLineLegendItems
            .transition().duration(600)
            .attr("font-weight", "normal");

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

            let selectedLineLegendItems = allLineLegendItems.filter(function() {
                let lineValue = d3.select(this).attr("lineByValue");
                return filterValues.indexOf(lineValue) !== -1;
              });

            let nonSelectedLineLegendItems = allLineLegendItems.filter(function() {
                let lineValue = d3.select(this).attr("lineByValue");
                return filterValues.indexOf(lineValue) == -1;
              });

            selectedLines
            .transition().duration(600)
            .attr("stroke-width", 2.5)
            .style("opacity", 1.0);

            nonSelectedLines
            .transition().duration(600)
            .attr("stroke-width", 1.5)
            .style("opacity", 0.35);

            selectedLineLegendItems
            .transition().duration(600)
            .attr("font-weight", "bold");

            nonSelectedLineLegendItems
            .transition().duration(600)
            .attr("font-weight", "normal");
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
        let nearestXValue = Math.round(this.xAxis.xScale.invert(relativeMouseXPosition));
        //let tooltipX = this.xAxis.xScale(nearestXValue);
       
        //return tooltipX;
        return nearestXValue;
    }

    private CalcTooltipY (relativeMouseYPosition: number, xValue: number): ITooltipData {
        //step 1 - find nearest line (somewhat ugly loop implementation)
        let nearestLinePosition;
        let nearestLine;

        this.nestedData.forEach((linesData) => {
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
        let tooltipYData: ITooltipData = {tooltipValues: [], tooltipYCoordinates: []};

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

        
        //console.log("tooltip data: ", tooltipYData);
        return tooltipYData;

        //console.log("nearest line: "+nearestLine);
        //return nearestLine;
        //return lineMeasureValues;
    }
    
    private CalculateTooltipValues(nearestXValue: number, tooltipValues: number[])
    {
        //Category values
        //this.tooltipCategoryValue.text(nearestXValue + " (" + this.selectedTooltipLineByValue + ")");
        this.tooltipCategoryValue.text(nearestXValue);
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

        let nearestXValue = this.CalcTooltipX(relativeMousePosition[0]);
        let tooltipXPosition = this.xAxis.xScale(nearestXValue);

        let tooltipYData = this.CalcTooltipY(relativeMousePosition[1], nearestXValue);

        //move tooltip line
        this.tooltipLine
        .attr("transform",
        "translate("+ tooltipXPosition +", 0)");

        this.tooltipTopLabel.text(this.tooltipNearestLine);

        //recalculate tooltip values
        this.CalculateTooltipValues(nearestXValue, tooltipYData.tooltipValues);

        //Move tooltip points
        this.MoveTooltipPoints(nearestXValue, tooltipYData.tooltipYCoordinates);
        
        //Resize background container
        this.tooltipValuesContainerWidth = this.maxLabelWidth + this.maxValueWidth + this.tooltipMarginHorizontal * 3;
        this.tooltipBackground.attr("width", this.tooltipValuesContainerWidth);

        //Resize divider line
        this.tooltipDivider.attr("width", this.tooltipValuesContainerWidth - this.tooltipMarginHorizontal * 2);

        //Calculate new values container position
        let proposedXPosition = Math.max(tooltipXPosition + 10, relativeMousePosition[0]);
        let proposedYPosition = relativeMousePosition[1];

        let tooltipValuesXPosition = (this.tooltipValuesContainerWidth + proposedXPosition) <= this.width ? proposedXPosition : (tooltipXPosition - this.tooltipValuesContainerWidth - 10);
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

    public AddLegendItem(legendType: string, legendText: string, legendStyle: string, legendStyleIndex: string, isLineBy: boolean) {
        let container: string = "legend"+legendType;
        let xPosition: string = "next"+legendType+"LegendItemX";

        //let legendTextLength: number = legendText.length * 7;
        //this.selectedTooltipValueLablel

        let legendTextElement = this[container]
        .append("text")
        .attr("x", this[xPosition])
        .attr("isLineLegend", isLineBy ? "1" : "0")
        .attr("lineByValue", isLineBy ? legendText : "")
        //.attr("width", legendTextLength)
        .attr("class", "legendText")
        .text(legendText)
        .on("click", () => {
            if(isLineBy) {
                this.SelectLine(legendText);
            };            
            /*
            if(this.parentVisual.graphSettings.enableTooltips) {
                if((this.parentVisual.graphSettings.colourByMeasure && legendType !== Colour) || (!this.parentVisual.graphSettings.colourByMeasure  && legendType === Colour))
                {
                    this.selectedTooltipValueLabel.attr("class", "legendText");
                    this.selectedTooltipValueLabel = legendTextElement;
                    legendTextElement.attr("class", "legendTextEm");
                    this.SetLabelLine(legendText);
                }
            }
            */
        });
        
        //set default selected tooltip
        /*
        if(this.parentVisual.graphSettings.enableTooltips) {
            if (!this.selectedTooltipValueLabel && ((this.parentVisual.graphSettings.colourByMeasure && legendType !== Colour) || (!this.parentVisual.graphSettings.colourByMeasure  && legendType === Colour)))
            {
                this.selectedTooltipValueLabel = legendTextElement;
                legendTextElement.attr("class", "legendTextEm");
            }
        }
        */

        let legendTextLength = legendTextElement.node().getBoundingClientRect().width;

        if (legendType === Colour) {
            this[container]
            .append("rect")
            .attr("width", "12")
            .attr("height", "12")
            .attr("fill", legendStyle)
            .attr("x", this[xPosition]+legendTextLength + 10)
            .attr("y", "-10")
            .on("click", () => {
                //console.log('Style index: '+legendStyleIndex);
                //this.IncrementColour(legendStyleIndex);

                this.colourPickerContext = legendText;
                console.log('selected colour item: ', legendText);
                this.legendColourPicker
                .attr("transform",
                "translate(" + 60 + ", 5)")
                .style("visibility", "visible");
            })
        }
        else {
            let legendLineContainerX = this[xPosition]+legendTextLength + 10;
            let legendLineContainerY = -10;
            
            let legendLineContainerWidth = 12;
            let legendLineContainerHeight = 12;

            let legendLineCoordinates: {x: number, y:number}[] = [{ "x": legendLineContainerX, "y": legendLineContainerY + legendLineContainerHeight }, { "x": legendLineContainerX + legendLineContainerWidth, "y": legendLineContainerY  }];

            //Draw line background container
            this[container]
            .append("rect")
            .attr("width", legendLineContainerWidth)
            .attr("height", legendLineContainerHeight)
            .attr("fill", "#F0F0F0")
            .attr("x", legendLineContainerX)
            .attr("y", legendLineContainerY)
            .on("click", () => {
                //console.log('Style index: '+legendStyleIndex);
                //this.IncrementColour(legendStyleIndex);
                this.IncrementLineStyle(legendStyleIndex);

            })


            //Draw legend line
            this[container]
            .append("line")
            .attr("stroke", "black")
            .attr("class", legendStyle)
            .attr("x1", legendLineCoordinates[0].x)
            .attr("y1", legendLineCoordinates[0].y)
            .attr("x2", legendLineCoordinates[1].x)
            .attr("y2", legendLineCoordinates[1].y);

        }

        this[xPosition] = this[xPosition] + legendTextLength + 50;
    }

}