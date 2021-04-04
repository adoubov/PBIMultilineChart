"use strict";

import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;


export class dataValidation {



}

export function ValidateData(dataViews: powerbi.DataView[]): boolean
{
    console.log('Test 1: Valid data view...');
    if (!dataViews
        || !dataViews[0]
        || !dataViews[0].categorical
        || !dataViews[0].categorical.categories
        || !dataViews[0].categorical.values
        || !dataViews[0].metadata
    ) {
        console.log('Test 1 FAILED. No data to draw table.');
        return false;
    }
    else {
        console.log('Data validated.');
        return true;
    }
}