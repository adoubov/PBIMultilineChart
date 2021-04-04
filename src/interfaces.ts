"use strict";

export interface ILineChartRow {
    xValue: number,
    yValues: number[],
    lineBy: string,
    colourBy: string
}

export interface IGroupBy {
    propertyName: string,
    propertyValues: any[]
}