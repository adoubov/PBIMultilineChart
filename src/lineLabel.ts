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
import { Graph } from "./graph";
import * as d3 from 'd3';

interface IBounds {
    top: number,
    right: number,
    bottom: number,
    left: number
}

interface INestedData {
    key: string,
    values: any,
    value: undefined
}

export class LineLabel {

    private parentGraph: Graph;
    private svg: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    private line: d3.Selection<SVGPathElement, INestedData, SVGGElement, any>; 
    private lineLabel: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    private labelText: string;
    private labelVisible: boolean;
    private bounds: IBounds;
    private labelWidth: number;
    private labelHeight: number;
    private labelX: number;
    private labelY: number;

    constructor(parentGraph: Graph, labelText: string, labelX: number, labelY: number) {
        //console.log("line ", line)
        this.parentGraph = parentGraph;
        this.svg = parentGraph.svg;
        //this.line = line;
        this.labelText = labelText;
        //this.labelText = line["key"];
        this.labelVisible = parentGraph.parentVisual.graphSettings.showLineLabels;
        this.bounds = parentGraph.graphBounds;
        this.labelWidth = 0;
        this.labelHeight = 0;
        this.labelX = labelX;
        this.labelY = labelY;
        
        this.renderLabel();
    }

    private renderLabel(): void {

        //render label, calculate size
        this.lineLabel = this.svg
        .append("text")
        .attr("class", "legendText")
        .attr("x", this.labelX)
        .attr("y", this.labelY)
        .text(this.labelText);

        this.labelWidth = this.lineLabel.node().getBoundingClientRect().width;
        this.labelHeight = this.lineLabel.node().getBoundingClientRect().height;
    
        this.lineLabel
        .call(d3.drag()
        .on('start', () => {
            this.parentGraph.HighlightLine(this.labelText)
        })
        .on('drag', () => {
            this.moveLabel(d3.event.dx, d3.event.dy);
        })
        .on('end', () => {
            this.parentGraph.SelectLine(null);
        })
        );
        this.lineLabel  
        .on("contextmenu", (() => {
            d3.event.preventDefault();
            this.lineLabel.remove();
        }))
        //this.lineLabel.call(d3.drag().on('dragstart', () => {console.log("test drag start!!!")}));
    
    }

    private moveLabel(xIncrement: number, yIncrement: number): void {
        let legalIncrementX: number;
        let legalIncrementY: number;

        //left movement
        if(Math.sign(xIncrement) === -1){
            legalIncrementX = xIncrement >= (this.bounds.left - this.labelX) ? xIncrement : (this.bounds.left - this.labelX);
        }
        //right movement
        else {
            legalIncrementX = xIncrement <= (this.bounds.right - (this.labelX + this.labelWidth)) ? xIncrement : (this.bounds.right - (this.labelX + this.labelWidth));
        }

        //upward movement
        if(Math.sign(yIncrement) === -1){
            legalIncrementY = yIncrement >= (this.bounds.top - this.labelY) ? yIncrement : (this.bounds.top - this.labelY);
        }
        //downward movement
        else {
            legalIncrementY = yIncrement <= (this.bounds.bottom - this.labelY) ? yIncrement : (this.bounds.bottom - this.labelY);
        }

        if(legalIncrementX !== 0 || legalIncrementY !== 0) {
            this.labelX += legalIncrementX;
            this.labelY += legalIncrementY;
            this.lineLabel
            .attr("x", this.labelX)
            .attr("y", this.labelY);
        }

    }


}