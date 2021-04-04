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

interface ITooltipMembers {
    tooltipMemberName: string,
    tooltipMemberDataIdx: number,
    isMeasure: boolean
}


export class GraphTooltip {

    private tooltipMembers: ITooltipMembers[];


    constructor(tooltipMembers: ITooltipMembers[]) {

    }

}