import { Colour, LineStyle } from "../constants";
import { Legend } from "../legend";
import { LegendV } from "../legendV";
import { Visual } from "../visual";
import { GetArrayDistinctValues } from "./miscFunctions";

export function BuildLegend(parentVisual: Visual) {
                //LEGEND
            let legendSVGHeight = parentVisual.legendByTrellis ? 20 : 40;
            let legendSVG = parentVisual.legendContainer
            .append("svg")
            .attr("width", parentVisual.OPTIONS.viewport.width)
            .attr("height", legendSVGHeight);

            //Measures legend. Not rendered on top of visual if trellising by measure with individual trellis legends
            if(!(parentVisual.legendByTrellis && parentVisual.trellisByMeasure)) {

    
                let legendSVGGroup = legendSVG
                .append("g")
                .attr("transform",
                "translate(10, 15)");
    
                let legendTitleRaw = parentVisual.measuresAll.length > 1 ? "Measures": "Measure";
                let legendType = parentVisual.graphSettings.colourByMeasure ? Colour : LineStyle;
                let categoryName = "MODEL_MEASURE";
                //console.log("viz legend type ", legendType )
                parentVisual.legend = new Legend(parentVisual, parentVisual.OPTIONS.viewport.width, 20, legendSVGGroup, legendTitleRaw, parentVisual.measuresAll, parentVisual.measuresAll, parentVisual.measuresAll, parentVisual.measuresDictionary, legendType, false, categoryName);
            }

            //Line by legend. Not rendered when not trellising by measure and showing individual legend trellis
            if(!(parentVisual.legendByTrellis && !parentVisual.trellisByMeasure)) {
                        //Legend
        let legendSVGGroup2 = legendSVG
        .append("g")
        /*
        .attr("transform",
        "translate(10, 35)");
        */
       if(parentVisual.legendByTrellis && parentVisual.trellisByMeasure) {
           legendSVGGroup2
           .attr("transform",
           "translate(10, 15)");
       }
       else {
           legendSVGGroup2
           .attr("transform",
           "translate(10, 35)");
       }

        //Legend Data
        let graphLegendTitle = "";
        //let lineByValue = parentVisual.
        if(parentVisual.nestedData.length == 1 || (parentVisual.lineByCategoryName.charAt(parentVisual.lineByCategoryName.length - 1) == "s") || parentVisual.lineByCategoryName == "All") {
            graphLegendTitle = parentVisual.lineByCategoryName;
        }
        else {
            graphLegendTitle = parentVisual.lineByCategoryName+"s";
        }

        let legendValuesGrouped: {visualGroupBy, lineBy: string []}[] = [];
        parentVisual.data.forEach((val) => {
            let valueIdx = legendValuesGrouped.findIndex((grpVal) => { return grpVal.visualGroupBy == val.visualGroupBy })
            if(valueIdx == -1) {
                legendValuesGrouped.push({visualGroupBy: val.visualGroupBy, lineBy: [val.lineBy]})
            }
            else {
                if(legendValuesGrouped[valueIdx].lineBy.indexOf(val.lineBy) == -1) {
                    legendValuesGrouped[valueIdx].lineBy.push(val.lineBy);
                }
            }
        });
        //console.log("questionable", legendValuesGrouped)
        let legendValuesDisplayNames = legendValuesGrouped.map(groupedValue => groupedValue.lineBy.join(" | "));
        
        let legendValues = [];
        parentVisual.data.forEach((data) => {
            let legendValue = data.visualGroupBy;
            if(legendValues.indexOf(legendValue) == -1) {
                legendValues.push(legendValue);
            }
        })

        let legendTooltips;
        if((parentVisual.legendLineByCategoryName == parentVisual.legendVisualGroupingByCategoryName) || (parentVisual.legendVisualGroupingByCategoryName == parentVisual.trellisByCategoryName)) {
            legendTooltips = legendValuesDisplayNames;
        }
        else {
            legendTooltips = [];
            legendValuesDisplayNames.forEach((displayName, idx) => {
                let tooltipString = displayName + " (" + parentVisual.legendVisualGroupingByCategoryName + ": " + legendValues[idx] + ")";
                legendTooltips.push(tooltipString);
            })
        }
        let legendType = parentVisual.graphSettings.colourByMeasure ? LineStyle : Colour;
        let categoryName = parentVisual.visualGroupByCategoryName;
        //console.log("questionable1")
        parentVisual.legend = new Legend(parentVisual, parentVisual.OPTIONS.viewport.width, 20, legendSVGGroup2, graphLegendTitle, legendValues, legendValuesDisplayNames, legendTooltips, parentVisual.visualGroupByDictionary, legendType, true, categoryName)
            }
}

export function BuildLegendVertical(parentVisual: Visual) {
    //LEGEND
let legendSVGWidth = 200;
parentVisual.legendContainer.style("width", legendSVGWidth + 'px');
let legendSVG = parentVisual.legendContainer
.append("svg")
.attr("width", legendSVGWidth)
.attr("height", parentVisual.OPTIONS.viewport.height);

let legendSVGGroup = legendSVG
.append("g")
.attr("transform",
"translate(10, 15)");

let legendLineHeight = 20;
let currentHeight = 0;

//Measures legend. Not rendered on top of visual if trellising by measure with individual trellis legends
if(!(parentVisual.legendByTrellis && parentVisual.trellisByMeasure)) {

    let legendTitleRaw = parentVisual.measuresAll.length > 1 ? "Measures": "Measure";
    let legendType = parentVisual.graphSettings.colourByMeasure ? Colour : LineStyle;
    let categoryName = "MODEL_MEASURE";
    //console.log("viz legend type ", legendType )
    parentVisual.legend = new LegendV(parentVisual, parentVisual.OPTIONS.viewport.width, 20, legendSVGGroup, legendTitleRaw, parentVisual.measuresAll, parentVisual.measuresAll, parentVisual.measuresAll, parentVisual.measuresDictionary, legendType, false, parentVisual.vertLegendNextY, categoryName);

}

//Line by legend. Not rendered when not trellising by measure and showing individual legend trellis
if(!(parentVisual.legendByTrellis && !parentVisual.trellisByMeasure)) {

//Legend Data
let graphLegendTitle = "";
//let lineByValue = parentVisual.
if(parentVisual.nestedData.length == 1 || (parentVisual.lineByCategoryName.charAt(parentVisual.lineByCategoryName.length - 1) == "s") || parentVisual.lineByCategoryName == "All") {
graphLegendTitle = parentVisual.lineByCategoryName;
}
else {
graphLegendTitle = parentVisual.lineByCategoryName+"s";
}

let legendValuesGrouped: {visualGroupBy, lineBy: string []}[] = [];
parentVisual.data.forEach((val) => {
let valueIdx = legendValuesGrouped.findIndex((grpVal) => { return grpVal.visualGroupBy == val.visualGroupBy })
if(valueIdx == -1) {
    legendValuesGrouped.push({visualGroupBy: val.visualGroupBy, lineBy: [val.lineBy]})
}
else {
    if(legendValuesGrouped[valueIdx].lineBy.indexOf(val.lineBy) == -1) {
        legendValuesGrouped[valueIdx].lineBy.push(val.lineBy);
    }
}
});
//console.log("questionable", legendValuesGrouped)
let legendValuesDisplayNames = legendValuesGrouped.map(groupedValue => groupedValue.lineBy.join(" | "));

let legendValues = [];
parentVisual.data.forEach((data) => {
let legendValue = data.visualGroupBy;
if(legendValues.indexOf(legendValue) == -1) {
    legendValues.push(legendValue);
}
})

let legendTooltips;
if((parentVisual.legendLineByCategoryName == parentVisual.legendVisualGroupingByCategoryName) || (parentVisual.legendVisualGroupingByCategoryName == parentVisual.trellisByCategoryName)) {
legendTooltips = legendValuesDisplayNames;
}
else {
legendTooltips = [];
legendValuesDisplayNames.forEach((displayName, idx) => {
    let tooltipString = displayName + " (" + parentVisual.legendVisualGroupingByCategoryName + ": " + legendValues[idx] + ")";
    legendTooltips.push(tooltipString);
})
}
let legendType = parentVisual.graphSettings.colourByMeasure ? LineStyle : Colour;
let categoryName = parentVisual.visualGroupByCategoryName;
//console.log("questionable1")
parentVisual.legend = new LegendV(parentVisual, parentVisual.OPTIONS.viewport.width, 20, legendSVGGroup, graphLegendTitle, legendValues, legendValuesDisplayNames, legendTooltips, parentVisual.visualGroupByDictionary, legendType, true, parentVisual.vertLegendNextY, categoryName);
}
}


function drawLegendColourVisual(yPos: number, legendStyle: string, legendStyleIndex: string): void {

    this.legendContainer
    .append("circle")
    .attr("r", 4)
    .attr("fill", legendStyle)
    .attr("cx", 0)
    .attr("cy", yPos)
    //.on("click", () => { this.parentVisual.IncrementColour(legendStyleIndex); })
 }
 
 function drawLegendLineStyleVisual(xPos: number, legendStyle: string, legendStyleIndex: string): void {
 
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
     .on("click", () => { this.parentVisual.IncrementLineStyle(legendStyleIndex); })
 
     this.legendContainer
     .append("line")
     .attr("stroke", "black")
     .attr("class", legendStyle)
     .attr("pointer-events", "none")
     .attr("x1", legendLineCoordinates[0].x)
     .attr("y1", legendLineCoordinates[0].y)
     .attr("x2", legendLineCoordinates[1].x)
     .attr("y2", legendLineCoordinates[1].y);
 
 }