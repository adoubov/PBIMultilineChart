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
import * as d3 from 'd3';
import { Visual } from "./visual"
import { Dictionary } from "./dictionary";
import {Colour, LineStyle } from "./constants";



interface ILegendValueSVG {
    legendValue: string | number,
    legendValueSVG: d3.Selection<SVGGElement, any, HTMLDivElement, any>,
    legendVisualSVG: d3.Selection<SVGGElement, any, HTMLDivElement, any>,
    legendTooltipSVG: d3.Selection<SVGGElement, any, HTMLDivElement, any>
}


export class Legend {
private parentVisual: Visual;
private width: number;
private height: number;
private legendContainer: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
private legendTitleRaw: string | number;
private legendValuesRaw: string [];
private legendValuesDisplayNames: string [];
private legendValuesTooltips: string [];
private legendValuesDictionary: Dictionary;
private legendType: string;
private categoryName: string;

private legendTitleSVG: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
private legendValuesSVG: ILegendValueSVG[];

//semi-constants - set once in the constructor
private legendItemMargin: number;
private legendSquareSize: number;
private legendTitleMarginMultiplier: number;
private legendItemSquareMarginMultiplier: number;
private filterEnabled: boolean;

constructor(parentVisual: Visual, width: number, height: number, legendContainer: d3.Selection<SVGGElement, any, HTMLDivElement, any>, legendTitleRaw: string | number, legendValuesRaw: string[], legendValuesDisplayNames: string[], legendValuesTooltips: string[], legendValuesDictionary: Dictionary, legendType: string, filterEnabled: boolean, categoryName: string) {

    this.parentVisual = parentVisual;
    this.width = width;
    this.height = height;
    this.legendContainer = legendContainer;
    this.legendTitleRaw = legendTitleRaw;
    this.legendValuesRaw = legendValuesRaw;
    this.legendValuesDisplayNames = legendValuesDisplayNames;
    this.legendValuesTooltips = legendValuesTooltips;
    this.legendValuesDictionary = legendValuesDictionary;
    this.legendType = legendType;
    this.legendValuesSVG = [];
    this.filterEnabled = filterEnabled;
    this.categoryName = categoryName;

    //set constants
    this.legendItemMargin = 8;
    this.legendSquareSize = 12;
    this.legendTitleMarginMultiplier = 1.2;
    this.legendItemSquareMarginMultiplier = 0.6;

    //console.log(this.legendValuesDisplayNames);

    this.initLegend();
}

private initLegend(): void {

    let nextLegendItemX = 0;
    let legendTitleText = this.legendTitleRaw == "" ? "" : this.legendTitleRaw + ":"

    //Start with legend title
    this.legendTitleSVG = this.legendContainer.append("text")
    .attr("class", "legendText")
    .text(legendTitleText)
    .on("click", () => {
        if(this.legendType == Colour) {
            this.parentVisual.ResetColours();
        }
        else {
            this.parentVisual.ResetLineStyles();
        }
    });

    //Calculate title width - to be used for determining max legend item widths
    let legendTitleWidth = this.legendTitleSVG.node().getBoundingClientRect().width;
    nextLegendItemX = legendTitleWidth + this.legendItemMargin * this.legendTitleMarginMultiplier;

    //calculate maximum space allocated for each text legend value
    //to do - implementation for vertical legend. simply set to width value
    let legendItemCount = this.legendValuesRaw.length;
    let legendTextMaxWidth = (
    this.width
    - legendTitleWidth
      //margin between title and legend items
    - this.legendItemMargin * this.legendTitleMarginMultiplier
      //margin between legend item and square
    - legendItemCount * this.legendItemMargin * this.legendItemSquareMarginMultiplier
      //reserved width for squares
    - legendItemCount * this.legendSquareSize
      //margin between legend items
    - legendItemCount * this.legendItemMargin
    ) / legendItemCount;
    
    //Legend Items
    this.legendValuesRaw.forEach((legendValue, idx) => {

        //Legend Item Text
        let legendItemTitle = this.legendContainer
        .append("text")
        .attr("class", "legendText")
        .attr("x", nextLegendItemX)
        .text(this.legendValuesDisplayNames[idx]);

        if (legendItemTitle.node().getBoundingClientRect().width > legendTextMaxWidth)
        {
            this.trimLegendItem(legendItemTitle, legendValue, legendTextMaxWidth);
        }

        //Tooltip events
        legendItemTitle
        .on("mouseover", () => {
           this.parentVisual.ShowLegendTooltip(this.legendValuesTooltips[idx], d3.event.pageX, d3.event.pageY);
        })
        .on("mousemove", () => {
            //this.OnGraphMouseMove(d3.event.pageX, d3.event.pageY);
            this.parentVisual.MoveLegendTooltip(d3.event.pageX, d3.event.pageY);
        })
        .on("mouseout", () => {
            //this.OnGraphMouseOut();
            //legendItemTooltip.style("visibility", "hidden");
            this.parentVisual.HideLegendTooltip();
        })
        .on("click", () => {
            if(this.filterEnabled) {
                this.parentVisual.SelectLines(legendValue);
            }
        })

        let legendItemTitleWidth = legendItemTitle.node().getBoundingClientRect().width;
        let legendItemVisualXPos = nextLegendItemX + legendItemTitleWidth + this.legendItemMargin * this.legendItemSquareMarginMultiplier;

        //Legend Item Visual
        if(this.legendType == Colour) {
            this.drawLegendColourVisual(legendItemVisualXPos, this.parentVisual.colourScale(this.legendValuesDictionary.Value(legendValue)).toString(), this.legendValuesDictionary.Value(legendValue), legendValue);
        }
        else {
            this.drawLegendLineStyleVisual(legendItemVisualXPos, this.parentVisual.lineStyleScale(this.legendValuesDictionary.Value(legendValue)).toString(), this.legendValuesDictionary.Value(legendValue), legendValue);
        }
        
        //Calculate starting x-position of next legend item
        nextLegendItemX = nextLegendItemX + legendItemTitleWidth + this.legendItemMargin * this.legendItemSquareMarginMultiplier + this.legendSquareSize + this.legendItemMargin;

    })
    
}

private drawLegendColourVisual(xPos: number, legendStyle: string, legendStyleIndex: string, itemName: string): void {

   this.legendContainer
   .append("circle")
   .attr("r", this.legendSquareSize / 3)
   .attr("fill", this.parentVisual.GetColour(itemName, this.categoryName))
   .attr("cx", xPos + 5)
   .attr("cy", "-5")
   .on("click", () => { this.parentVisual.IncrementColour(itemName, this.categoryName); })
}

private drawLegendLineStyleVisual(xPos: number, legendStyle: string, legendStyleIndex: string, itemName: string): void {

    let legendLineContainerX = xPos;
    let legendLineContainerY = -10;

    let legendLineCoordinates: {x: number, y:number}[] = [{ "x": legendLineContainerX, "y": legendLineContainerY + this.legendSquareSize }, { "x": legendLineContainerX + this.legendSquareSize, "y": legendLineContainerY  }];

    this.legendContainer
    .append("rect")
    .attr("width", this.legendSquareSize)
    .attr("height", this.legendSquareSize)
    .attr("fill", "#F0F0F0")
    .attr("x", legendLineContainerX)
    .attr("y", legendLineContainerY)
    .on("click", () => { this.parentVisual.IncrementLineStyle(itemName, this.categoryName); })

    this.legendContainer
    .append("line")
    .attr("stroke", "black")
    .attr("class", (() => {return this.parentVisual.GetLineStyle(itemName, this.categoryName)}))
    .attr("pointer-events", "none")
    .attr("x1", legendLineCoordinates[0].x)
    .attr("y1", legendLineCoordinates[0].y)
    .attr("x2", legendLineCoordinates[1].x)
    .attr("y2", legendLineCoordinates[1].y);

}

private trimLegendItem(legendItem: d3.Selection<SVGGElement, any, HTMLDivElement, any>, legendItemValue: string | number, maxWidth: number): void {
    
    var itemValue = legendItemValue.toString();
    while (itemValue.length > 1 && legendItem.node().getBoundingClientRect().width > maxWidth) {
        itemValue = itemValue.substring(0, itemValue.length - 1);
        legendItem.text(itemValue + "..");
    }

}

}

