"use strict";

import { dataViewObjectsParser } from "powerbi-visuals-utils-dataviewutils";
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;

export class VisualSettings extends DataViewObjectsParser {
      public graphSettings: graphSettings = new graphSettings();
      //public dataColors: dataColors = new dataColors();
      }

    export class graphSettings {

      public dateContinuous: boolean = true;
      public enableMultipleYAxes: boolean = true;
      public showSliders: boolean = true;
      public colourByMeasure: boolean = false;
      public trellisByMeasure: boolean = false;
      public enableTooltips: boolean = true;
      public enableCrossVizFilters: boolean = true;
      public xScaleByTrellis: boolean = false;
      public yScaleByTrellis: boolean = true;
      public distinctVisualGroupByStylesPerTrellis: boolean = true;
      public distinctMeasureStylesPerTrellis: boolean = true;
      public legendByTrellis: boolean = true;
      public showTrellisTitle: boolean = false;
      public showLineLabels: boolean = false;
      //public trellisRows: number = 1;
      public trellisColumns: number = 1;
      public chartConfig: string = "";
      trellisAutoLayout: boolean = true;
      public verticalLegend : boolean = false;
     }

     export class dataColors {
      
     }
     /*
,
        "dataColors": {
            "displayName": "Data Colors",
            "properties": {
                "fill": {
                    "displayName": "Color",
                    "type": {
                        "fill": {
                            "solid": {
                                "color": true
                            }
                        }
                    }
                }
            }
        },
        "lineStyles": {
            "displayNameKey": "Objects_LineStyles",
            "descriptionKey": "Objects_LineStyles_Description",
            "displayName": "Line Styles",
            "description": "Line Styles description.",
            "properties": {
                
            }
        }
     */

