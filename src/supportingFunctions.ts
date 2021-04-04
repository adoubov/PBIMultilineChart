"use strict";

import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import * as d3 from 'd3';

//import { ILineChartRow } from "./interfaces"

interface ITooltipMembers {
    tooltipMemberName: string,
    tooltipMemberDataIdx: number,
    isMeasure: boolean
}

export function SortNumbersCallback(a, b) {
    return a > b ? 1 : b > a ? -1 : 0;
  }

export function GetYValues(valuesArray: powerbi.DataViewValueColumn[], index: number)
{
    var returnArray: number[] = [];
    valuesArray.forEach(function(member){
        returnArray.push(member.values[index] as number);
    })
    return returnArray;
}

export function GetTooltipValues(tooltipMembers: ITooltipMembers[], categoricalData: powerbi.DataViewCategorical, index: number): string | number []
{
    let resultArray = []

    tooltipMembers.forEach((tooltipMember) => {
        if(!tooltipMember.isMeasure) {
            resultArray.push(categoricalData.categories[tooltipMember.tooltipMemberDataIdx].values[index])
        }
        else {
            resultArray.push(categoricalData.values[tooltipMember.tooltipMemberDataIdx].values[index])
        }
    })

    return resultArray;
}

export function GetDistinctValues(categoricalData: powerbi.DataViewCategorical, groupings: IGroupBy[]): void {
    var distinctValues = [];

    groupings.forEach(function (grouping) {
    
        //get column values
        var columnValues = categoricalData.categories.filter(function (column) {
            return column.source.displayName === grouping.propertyName
        });
        
        
        if (columnValues[0].values.length !== 0) {
            
            columnValues[0].values.forEach(function (dataValue) {
                
                if (grouping.propertyValues.indexOf(dataValue) === -1) {
                    grouping.propertyValues.push(dataValue);
                }
                
            })

            //distinctCount += distinctValues.length;

        }
        

    })

    //return distinctValues;

}

export function InitializeLineByColourBy(categoricalData: powerbi.DataViewCategorical, lineBy: IGroupBy[], colourBy: IGroupBy[]): void {

    categoricalData.categories.forEach(function (categoricalValue) {
        if(categoricalValue.source.roles['lineBy']){
            /*
            if(lineBy.indexOf(categoricalValue.source.displayName) === -1) {
                lineBy.push(categoricalValue.source.displayName)
            };
            */
            //console.log(lineBy.some((y) => y.propertyName === categoricalValue.source.displayName));
            if(!lineBy.some(function(x){
                //console.log("now evaluating "+x.propertyName+" against "+categoricalValue.source.displayName);
                return x.propertyName === categoricalValue.source.displayName;
            })){

                lineBy.push({propertyName: categoricalValue.source.displayName, propertyValues: []});
                //console.log("Adding unique LineBy Value: "+categoricalValue.source.displayName);
            }
        }
        if(categoricalValue.source.roles['visualGroupBy']){
            /*
            if(colourBy.indexOf(categoricalValue.source.displayName) === -1) {
                colourBy.push(categoricalValue.source.displayName)
            };
            */
           if(!colourBy.some(function(x){
            return x.propertyName === categoricalValue.source.displayName;
        })){
            colourBy.push({propertyName: categoricalValue.source.displayName, propertyValues: []});
        }
        }
    });
}

/*
export function GetColourString(data: ILineChartRow[], colourScale: d3.ScaleOrdinal<string, unknown>, keyValue: string, lineBy: IGroupBy, colourBy: IGroupBy): string{
    if(lineBy.propertyName === colourBy.propertyName || colourBy.propertyValues.length > lineBy.propertyValues.length)
    {
        return colourScale(keyValue) as string;
    }
    else
    {
        return colourScale(MapColourKey(data, lineBy.propertyName, colourBy.propertyName, keyValue)) as string;
    }
}
*/
export function GetColourString(colourBy: string, colourScale: d3.ScaleOrdinal<string, unknown>): string{
    return colourScale(colourBy) as string;
}

export function RenderMeasuresLegend() {

}

export function RenderLineByLegend() {
    
}



function MapColourKey(data: ILineChartRow[], lineByPropertyName: string, colourByPropertyName: string, keyValue: string): string{
    
    var key =  data.find(function(x){
        /*
        console.log(x[lineByPropertyName]);
        console.log(keyValue);
        console.log(x[lineByPropertyName] == keyValue);
        */
        return x[lineByPropertyName] == keyValue
    })[colourByPropertyName]
    console.log(key);
    return key;
}


interface IGroupBy {
    propertyName: string,
    propertyValues: any[]
}

interface ILineChartRow {
    xValue: number,
    yValues: number[],
    lineBy: string,
    colourBy: string
}