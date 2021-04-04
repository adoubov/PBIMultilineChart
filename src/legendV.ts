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


export class LegendV {
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
private currentHeight: number;

//semi-constants - set once in the constructor
private legendItemMargin: number;
private legendSquareSize: number;
private legendTitleMarginMultiplier: number;
private legendItemSquareMarginMultiplier: number;
private filterEnabled: boolean;
private lineHeight: number;

constructor(parentVisual: Visual, width: number, height: number, legendContainer: d3.Selection<SVGGElement, any, HTMLDivElement, any>, legendTitleRaw: string | number, legendValuesRaw: string[], legendValuesDisplayNames: string[], legendValuesTooltips: string[], legendValuesDictionary: Dictionary, legendType: string, filterEnabled: boolean, startingHeight: number, categoryName: string) {

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
    //this.currentHeight = startingHeight;
    this.categoryName = categoryName;

    //set constants
    this.legendItemMargin = 8;
    this.legendSquareSize = 12;
    this.legendTitleMarginMultiplier = 1.2;
    this.legendItemSquareMarginMultiplier = 0.6;
    this.lineHeight = 20;

    //console.log(this.legendValuesDisplayNames);

    this.initLegend(startingHeight);
}

private initLegend(startingHeight: number): void {

    let nextLegendItemY = startingHeight;
    let legendTitleText = this.legendTitleRaw == "" ? "" : this.legendTitleRaw + ":"

    //Start with legend title
    this.legendTitleSVG = this.legendContainer.append("text")
    .attr("class", "legendText")
    .attr("x", 0)
    .attr("y", nextLegendItemY)
    .text(legendTitleText)
    .on("click", () => {
        if(this.legendType == Colour) {
            this.parentVisual.ResetColours();
        }
        else {
            this.parentVisual.ResetLineStyles();
        }
    });
    nextLegendItemY += this.lineHeight;
    
    //Legend Items
    this.legendValuesRaw.forEach((legendValue, idx) => {

        //Legend Item Visual
        if(this.legendType == Colour) {
            this.drawLegendColourVisual(nextLegendItemY, this.parentVisual.colourScale(this.legendValuesDictionary.Value(legendValue)).toString(), this.legendValuesDictionary.Value(legendValue), legendValue);
        }
        else {
            this.drawLegendLineStyleVisual(nextLegendItemY, this.parentVisual.lineStyleScale(this.legendValuesDictionary.Value(legendValue)).toString(), this.legendValuesDictionary.Value(legendValue), legendValue);
        }

        //Legend Item Text
        let legendItemTitle = this.legendContainer
        .append("text")
        .attr("class", "legendText")
        .attr("x", 20)
        .attr("y", nextLegendItemY)
        .text(this.legendValuesDisplayNames[idx]);

        //Tooltip events
        legendItemTitle
        .on("mouseover", () => {
            //this.OnGraphMouseOver(d3.event.pageX, d3.event.pageY);
            /*
            legendItemTooltip.style("visibility", "visible")
            .attr("transform",
            "translate(0, 20)");
            */

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

       
        //Calculate starting x-position of next legend item
        nextLegendItemY += this.lineHeight;

    })
    this.parentVisual.vertLegendNextY = nextLegendItemY + this.lineHeight;
}

private drawLegendColourVisual(yPos: number, legendStyle: string, legendStyleIndex: string, itemName: string): void {

    /*
    this.legendContainer
    .append("rect")
    .attr("width", this.legendSquareSize)
    .attr("height", this.legendSquareSize)
    .attr("fill", legendStyle)
    .attr("x", xPos)
    .attr("y", "-10")
    .on("click", () => { this.parentVisual.IncrementColour(legendStyleIndex); })
    */
   this.legendContainer
   .append("circle")
   .attr("r", this.legendSquareSize / 3)
   .attr("fill", this.parentVisual.GetColour(itemName, this.categoryName))
   .attr("cx", 0)
   .attr("cy", yPos - 4)
   .on("click", () => { this.parentVisual.IncrementColour(itemName, this.categoryName); })
}

private drawLegendLineStyleVisual(yPos: number, legendStyle: string, legendStyleIndex: string, itemName: string): void {

    let legendLineContainerX = 0;
    let legendLineContainerY = yPos - 10;

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


}

