"use strict";

import * as d3 from 'd3';
import { YAxis } from './yAxis';
import { XAxis } from './xAxis';

export class VerticalRangeSlider{
    public parentYAxis: YAxis;

    private sliderScale: d3.ScaleLinear<number, number>;
    
    private handleTopY: number;
    private handleBottomY: number;
    private handleTop: d3.Selection<SVGCircleElement, any, HTMLDivElement, any>;
    private handleBottom: d3.Selection<SVGCircleElement, any, HTMLDivElement, any>;
    private mouseoverHandler;
    private sliderId;

constructor(parentYAxis: YAxis){
    this.parentYAxis = parentYAxis;

    this.sliderScale = d3.scaleLinear()
    .domain([this.parentYAxis.yScale.range()[0], this.parentYAxis.yScale.range()[1]])
    .range([this.parentYAxis.yScale.domain()[0], this.parentYAxis.yScale.domain()[1]]);

    this.handleTopY = this.sliderScale.domain()[1];
    this.handleBottomY = this.sliderScale.domain()[0];

    this.sliderId = parentYAxis.yAxisDesc+'Slider';
    this.initSlider();

}

private initSlider(): void{
 
    this.handleTop = this.parentYAxis.sliderContainer.insert("circle", ".track-overlay")
    .attr("class", "handle")
    .attr("r", 6)
    .attr("cy", this.handleTopY)
    .attr("desc", this.handleTopY)
    .attr("id", this.sliderId)
    .call(d3.drag()
    .on('drag', (() => {
        this.moveHandle('handleTop', this.handleTopY, d3.event.dy, this.sliderScale.domain()[1], (this.handleBottomY - 12));
    })));

    this.handleBottom = this.parentYAxis.sliderContainer.insert("circle", ".track-overlay")
    .attr("class", "handle")
    .attr("r", 6)
    .attr("cy", this.handleBottomY)
    .attr("desc", this.handleBottomY)
    .attr("id", this.sliderId)
    .call(d3.drag()
    .on('drag', (() => {
        this.moveHandle('handleBottom', this.handleBottomY, d3.event.dy, (this.handleTopY + 12), this.sliderScale.domain()[0]);
    })));
    
}


private moveHandle(handle: string, curPos: number, increment: number, topBound: number, bottomBound:number): void {
    
        let legalIncrement: number;
        let currentPosition: number = curPos;

        //upward movement
        if(Math.sign(increment) === -1){
            legalIncrement = increment >= (topBound - currentPosition) ? increment : (topBound - currentPosition);
        }
        //downward movement
        else {
            legalIncrement = increment <= (bottomBound - currentPosition) ? increment : (bottomBound - currentPosition);
        }
        
    if(legalIncrement !== 0){
        currentPosition = (currentPosition + legalIncrement)
        this[handle+'Y'] = currentPosition;
        this[handle].attr("cy", currentPosition);

          this.parentYAxis.UpdateAxisDomain([this.sliderScale(this.handleBottomY), this.sliderScale(this.handleTopY)]);
    }
}

}


export class HorizontalRangeSlider{
    public parentXAxis: XAxis;

    private sliderScale: d3.ScaleLinear<number, number>;
    
    private handleLeftX: number;
    private handleRightX: number;
    private handleLeft: d3.Selection<SVGCircleElement, any, HTMLDivElement, any>;
    private handleRight: d3.Selection<SVGCircleElement, any, HTMLDivElement, any>;
    private mouseoverHandler;

constructor(parentXAxis: XAxis){
    this.parentXAxis = parentXAxis;

    this.sliderScale = d3.scaleLinear()
    .domain([this.parentXAxis.xScale.range()[0], this.parentXAxis.xScale.range()[1]])
    .range([this.parentXAxis.xScale.domain()[0], this.parentXAxis.xScale.domain()[1]]);

    this.handleLeftX = this.sliderScale.domain()[0];
    this.handleRightX = this.sliderScale.domain()[1];

    this.initSlider();

}

private initSlider(): void{
 
    this.handleLeft = this.parentXAxis.sliderContainer.insert("circle", ".track-overlay")
    .attr("class", "handle")
    .attr("r", 6)
    .attr("cx", this.handleLeftX)
    .attr("desc", this.handleLeftX)
    .call(d3.drag()
    .on('drag', (() => {
        this.moveHandle('handleLeft', this.handleLeftX, d3.event.dx, this.sliderScale.domain()[0], (this.handleRightX - 12));
    })));

    this.handleRight = this.parentXAxis.sliderContainer.insert("circle", ".track-overlay")
    .attr("class", "handle")
    .attr("r", 6)
    .attr("cx", this.handleRightX)
    .attr("desc", this.handleRightX)
    .call(d3.drag()
    .on('drag', (() => {
        this.moveHandle('handleRight', this.handleRightX, d3.event.dx, (this.handleLeftX + 12), this.sliderScale.domain()[1]);
    })));
    
}


private moveHandle(handle: string, curPos: number, increment: number, leftBound: number, rightBound:number): void {
    
        let legalIncrement: number;
        let currentPosition: number = curPos;

        //leftward movement
        if(Math.sign(increment) === -1){
            legalIncrement = increment >= (leftBound - currentPosition) ? increment : (leftBound - currentPosition);
        }
        //rightward movement
        else {
            legalIncrement = increment <= (rightBound - currentPosition) ? increment : (rightBound - currentPosition);
        }
        
    if(legalIncrement !== 0){
        currentPosition = (currentPosition + legalIncrement)
        this[handle+'X'] = currentPosition;
        this[handle].attr("cx", currentPosition);

        this.parentXAxis.UpdateAxisDomain([this.sliderScale(this.handleLeftX), this.sliderScale(this.handleRightX)]);
          
    }
}
}