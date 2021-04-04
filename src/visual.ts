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
import * as d3 from 'd3';
import { ValidateData } from "./dataValidation";
import { GetDistinctValues, InitializeLineByColourBy, GetColourString, GetYValues, GetTooltipValues } from "./supportingFunctions";
//import { ILineChartRow } from "./interfaces";
import { VerticalRangeSlider } from "./rangeSlider"
import { Graph } from "./graph";
import { Dictionary } from "./dictionary";
import { Legend } from "./legend";
import { LegendV } from "./legendV";
import * as models from "powerbi-models";
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import {Colour, LineStyle } from "./constants";
import {BuildLegend, BuildLegendVertical} from "./functions/legendFunctions"
import VisualObjectInstancesToPersist = powerbi.VisualObjectInstancesToPersist;
import { xml } from "d3";
import { GetConfig, GetConfigColourValue, GetConfigLineStyleValue, AssignNewColourValue, AssignNewLineStyleValue, SaveConfig, AddConfigColourValue, UpdateColourValue, AddConfigLineStyleValue, UpdateLineStyleValue } from "./functions/configFunctions"

interface IChartConfigSettings {
    dataColours: IChartConfigValue []
    lineStyles: IChartConfigValue []
}

interface IChartConfigValue {
    name: string
    type: string
    value: string
}

interface IDataColor {
    name: string;
    color: string;
}

interface IGroupBy {
    propertyName: string,
    propertyValues: any[]
}

interface ILineChartRow {
    xValue: number,
    yValuesLeft: number[],
    yValuesRight: number[],
    lineBy: string,
    visualGroupBy: string,
    trellisBy: string,
    tooltipData: string | number[]
}

interface INestedData {
    key: string,
    values: any,
    value: undefined
}

interface ITrellisNestedData {
    trellisIndex: string,
    nestedData: INestedData[]
}

interface ITooltipMembers {
    tooltipMemberName: string,
    tooltipMemberDataIdx: number,
    isMeasure: boolean
}

interface IDataType {
    measure: string,
    dataType: string
}

export class Visual implements IVisual {
    private target: HTMLElement;
    public settings: VisualSettings;
    public visualContainer: d3.Selection<HTMLDivElement, any, HTMLDivElement, any>;
    public graphGridContainer: d3.Selection<HTMLDivElement, any, HTMLDivElement, any>;
    public container: d3.Selection<HTMLDivElement, any, HTMLDivElement, any>;
    public legendContainer: d3.Selection<HTMLDivElement, any, HTMLDivElement, any>;
    public graphContainers: d3.Selection<HTMLDivElement, any, HTMLDivElement, any>[];
    public data: ILineChartRow[];
    public nestedData: INestedData[][];
    public colourScale: d3.ScaleOrdinal<string, unknown>;
    public lineStyleScale: d3.ScaleOrdinal<string, unknown>;
    public colours: string[];
    public lineStyles: string[];
    public vertLegendNextY: number;

    public trellisNestedData: ITrellisNestedData[];

    public legend: Legend | LegendV;

    private graphs: Graph[];


    public graphSettings: graphSettings;

    public measuresDictionary: Dictionary;
    public visualGroupByDictionary: Dictionary;

    public measuresLeft: string[];
    public measuresRight: string[];
    public measuresAll: string[];
    public xCategoryName: string;
    public xCategoryIsDate: boolean;
    public trellisByCategoryName: string;
    public lineByCategoryName: string;
    public visualGroupByCategoryName: string;
    public OPTIONS: VisualUpdateOptions;
    private host: IVisualHost;
    public visualFilter: models.IBasicFilter;

    public filterValues: string[];
    private lineByDataType;

    private trellisValues: string[];

    private dataUpdateExternalFilterOnly: boolean;

    //Legend
    private globalTooltipCanvas;
    private legendTooltipContainer: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    private legendTooltipText: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    private legendTooltipBackground: d3.Selection<SVGGElement, any, HTMLDivElement, any>;
    public legendLineByCategoryName: string;
    public legendVisualGroupingByCategoryName: string;

    public dataTypes: IDataType[];

    //Tooltip
    public tooltipMembers: ITooltipMembers[];

    //misc
    private tableName: string;

    //config - to be moved to new object
    public trellisByMeasure: boolean;
    public legendByTrellis: boolean;

    public monthNames: string[];

    //config options
    public dataColors: IDataColor[];
    public chartConfig: IChartConfigSettings;

    constructor(options: VisualConstructorOptions) {
        console.log('Visual constructor', options);
        this.target = options.element;

        //let artemTest = options.host.persistProperties;
        //console.log("artem test, ", artemTest)

        
        this.globalTooltipCanvas = d3.select(this.target)
        .append("svg")
        .attr("pointer-events", "none")
        .style("position", "absolute")
        .style("top", '0px')
        .style("left", '0px');

        this.legendTooltipContainer = this.globalTooltipCanvas
        .append("g")
        .style("visibility", "hidden")
        .attr("height", 20)
        .attr("transform",
        "translate(0, 0)");

        this.legendTooltipText = this.legendTooltipContainer
        .append("text")
        .attr("class", "legendText")
        //.style("position", "absolute")
        .text("123")
        .attr("transform",
        "translate(0, 0)");

        /*
        this.legendTooltipBackground = this.legendTooltipContainer
        .append("rect")
        .attr("width", 50)
        .attr("height", 20)
        //.style("position", "absolute")
        .attr("x", 0)
        .attr("y", 0)
        .attr("fill", "#e0e0e0")
        //.style("opacity", 0.5)
        .attr("transform",
        "translate(0, 0)");
*/


        //this.legendTooltipText.prototype.moveToBack
        //vizContainer
        this.visualContainer = d3.select(this.target)
        .append('div')
        //.attr('height', 40)
        .attr('class', 'vizContainer');


        this.legendContainer = this.visualContainer
        .append('div')
        //.attr('height', 40)
        .attr('id', 'legend_div')

        this.graphGridContainer = this.visualContainer
        .append('div')
        //.attr('height', 400)
        .attr('id', 'graphGridContainer');

        this.container = this.graphGridContainer
            .append('div')
            //.attr('height', 400)
            .attr('id', 'my_dataviz');

        this.data = [];
        this.nestedData = [];
        this.trellisNestedData = [];

        this.graphContainers = [];
        this.graphs = [];

        this.measuresLeft = [];
        this.measuresRight = [];
        this.measuresAll = [];

        this.filterValues = [];
        this.trellisValues = [];
        this.tooltipMembers = [];

        this.dataTypes = [];

        this.measuresDictionary = new Dictionary();
        this.visualGroupByDictionary = new Dictionary();

        this.monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        //this.colours = ['#377eb8', '#e41a1c', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf', '#A9A9A9'];
        this.colours = ["#0000FF","#FF0000","#00FF00","#FF8000","#FFFF00","#8000FF","#FF00FF","#FF0080","#0080FF","#00FFFF","#80FF00","#00FF80"];
        this.lineStyles = ['lineGroup1', 'lineGroup2', 'lineGroup3', 'lineGroup4', 'lineGroup5', 'lineGroup6', 'lineGroup7', 'lineGroup8', 'lineGroup9'];

        //scales
        this.colourScale = d3.scaleOrdinal()
            //.domain(this.data.map(row => row.visualGroupBy))
            .range(this.colours);

        this.lineStyleScale = d3.scaleOrdinal()
            .range(this.lineStyles); 

        this.host = options.host;

        this.visualFilter = {
            "$schema": "http://powerbi.microsoft.com/product/schema#basic",
            filterType: models.FilterType.Basic,
            target: {
                table: "",
                column: ""
            },
            operator: "In",
            values: []
        }

        this.dataUpdateExternalFilterOnly = false;

        //SaveConfig(this.host, JSON.stringify({dataColours:[], lineStyles: []}));
    }

    public update(options: VisualUpdateOptions) {
        //console.log("update type: "+options.type );
        if (!this.dataUpdateExternalFilterOnly) {
            console.log("updating visual");

            
            
            this.vertLegendNextY = 0;
            this.OPTIONS = options;
            this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
            this.chartConfig = GetConfig(this.host, options.dataViews[0].metadata);
            
            
            this.graphSettings = this.settings["graphSettings"];

            //legend settings
            this.legendContainer
            .attr('class', () => {
                try{
                    if(this.graphSettings.verticalLegend) {return "legendContainerV";}
                    else {return "legendContainerH"}
                }          
                    catch(ex) {
                        console.log(ex)
                    }
            });
            //graphGridContainerVLegend
            this.graphGridContainer
            .attr('class', () => {
                try{
                    if(this.graphSettings.verticalLegend) {return "graphGridContainerVLegend";}
                    else {return "graphGridContainerHLegend"}
                }          
                    catch(ex) {
                        console.log(ex)
                    }
            });

            this.globalTooltipCanvas
            .attr("width", options.viewport.width)
            .attr("height", options.viewport.height);


            //clear data on update
            this.legendContainer.selectAll('*').remove();
            this.container.selectAll('*').remove();
            this.data.splice(0, this.data.length);
            this.nestedData.splice(0, this.nestedData.length);
            this.graphs.splice(0, this.graphs.length);
            this.graphContainers.splice(0, this.graphContainers.length);
            this.measuresLeft.splice(0, this.measuresLeft.length);
            this.measuresRight.splice(0, this.measuresRight.length);
            this.measuresAll.splice(0, this.measuresAll.length);
            this.trellisValues.splice(0, this.trellisValues.length);
            this.tooltipMembers.splice(0, this.tooltipMembers.length);

            this.measuresDictionary.Clear();
            this.visualGroupByDictionary.Clear();

            console.log('Visual update', options);

            let dataViews = options.dataViews;
            //validate data
            if (!ValidateData(dataViews)) {
                return
            }

            //DATA LOADING
            //will include check for update type
            if (true) {

                let categorical = dataViews[0].categorical;

                //measure data types
                //this.dataTypes = categorical.values.map(measure => {measure: measure.source.displayName; dataType: measure.source.format});
               //console.log("testAAA", categorical.values.map(measure => {measure: measure.source.displayName; dataType: measure.source.format}));
               
               categorical.values.forEach(measure => {
                   this.dataTypes.push({measure: measure.source.displayName, dataType: measure.source.format});
               })
              //console.log("testAAA", this.dataTypes); 
              

                this.tableName = categorical.categories[0].source.queryName.substring(0, categorical.categories[0].source.queryName.indexOf('.'));
                this.visualFilter.target['table'] = this.tableName;
                console.log('test filter: ', this.visualFilter)

                let LineBy: IGroupBy[] = [];
                let VisualGroupBy: IGroupBy[] = [];
                InitializeLineByColourBy(categorical, LineBy, VisualGroupBy);
                GetDistinctValues(categorical, LineBy);
                GetDistinctValues(categorical, VisualGroupBy);

                let idxLineBy: number = categorical.categories.indexOf(categorical.categories.find(member => member.source.roles['lineBy']));
                let idxVisualGroupBy: number = categorical.categories.indexOf(categorical.categories.find(member => member.source.roles['visualGroupBy']));
                let idxTrellisBy: number = categorical.categories.indexOf(categorical.categories.find(member => member.source.roles['trellisBy']));

                let useVisualGroupByForLineBy: boolean = (!!LineBy[0] && (VisualGroupBy[0] && VisualGroupBy[0].propertyValues.length > LineBy[0].propertyValues.length));
                let useLineByForVisualGroupBy: boolean = !VisualGroupBy[0];

                //console.log("zzzzaewrawer", useLineByForVisualGroupBy, useVisualGroupByForLineBy)

                this.xCategoryName = categorical.categories[0].source.displayName;
                this.xCategoryIsDate = typeof(categorical.categories[0].values[0]) == "number" ? false : true;
                //console.log("is date: ", this.xCategoryIsDate)
                
                this.lineByCategoryName = (idxLineBy == -1 && idxVisualGroupBy == -1 && idxTrellisBy == -1) ? "All": ((idxLineBy == -1 && idxVisualGroupBy == -1 && idxTrellisBy != -1) ? categorical.categories[idxTrellisBy].source.displayName : (useVisualGroupByForLineBy ? categorical.categories[idxVisualGroupBy].source.displayName : categorical.categories[idxLineBy].source.displayName));
                this.trellisByCategoryName = idxTrellisBy === -1 ? null : categorical.categories[idxTrellisBy].source.displayName;
                this.trellisByMeasure = (this.graphSettings.trellisByMeasure && idxTrellisBy === -1) ? true : false;
                //this.visualGroupByCategoryName = idxVisualGroupBy === -1 ? "" : categorical.categories[idxVisualGroupBy].source.displayName;
                this.visualGroupByCategoryName = useLineByForVisualGroupBy ? this.lineByCategoryName : categorical.categories[idxVisualGroupBy].source.displayName;
                
                //console.log(this.visualGroupByCategoryName);
                
                //set filter column
                this.visualFilter.target["column"] = this.lineByCategoryName;

                //set data type for line by
                let tempIdxLineBy = useVisualGroupByForLineBy ? idxVisualGroupBy : idxLineBy;
                this.lineByDataType = (idxLineBy == -1 && idxVisualGroupBy == -1) ? "string": typeof (categorical.categories[tempIdxLineBy].values[0]);

                //populate tooltip members array - names and type
                //categorical data
                categorical.categories.forEach((member, idx) => {
                    if(member.source.roles["tooltipData"] && !member.source.roles["category"]) {
                        let mbr = {tooltipMemberName: member.source.displayName, tooltipMemberDataIdx: idx, isMeasure: false};
                        if(this.tooltipMembers.filter((m) => {return m.tooltipMemberName == mbr.tooltipMemberName && m.isMeasure == false}).length == 0) {
                            this.tooltipMembers.push(mbr);
                        }
                    }
                });
                //measure data
               categorical.values.forEach((member, idx) => {
                    if(member.source.roles["tooltipData"] && !(member.source.roles["measureYLeft"] || member.source.roles["measureYRight"]) ) {
                        let mbr = {tooltipMemberName: member.source.displayName, tooltipMemberDataIdx: idx, isMeasure: true};
                        if(this.tooltipMembers.filter((m) => {return m.tooltipMemberName == mbr.tooltipMemberName && m.isMeasure == true}).length == 0) {
                            this.tooltipMembers.push(mbr);
                        }
                    }
                });
                //console.log("test tooltip members array: ", this.tooltipMembers);

                categorical.categories[0].values.forEach((categoricalValue, index) => {

                    let tempLineBy: string = null;
                    let tempVisualGroupBy: string = null;

                    if (idxLineBy != -1) {

                        if (useVisualGroupByForLineBy) {
                            tempVisualGroupBy = categorical.categories[idxVisualGroupBy].values[index].toString();
                            tempLineBy = tempVisualGroupBy;
    
                            this.legendLineByCategoryName = categorical.categories[idxVisualGroupBy].source.displayName;
                            this.legendVisualGroupingByCategoryName = categorical.categories[idxVisualGroupBy].source.displayName;
                        }
                        else if (useLineByForVisualGroupBy) {
                            tempLineBy = categorical.categories[idxLineBy].values[index].toString();
                            tempVisualGroupBy = tempLineBy;
    
                            this.legendLineByCategoryName = categorical.categories[idxLineBy].source.displayName;
                            this.legendVisualGroupingByCategoryName = categorical.categories[idxLineBy].source.displayName;
                        }
                        else {
                            tempLineBy = categorical.categories[idxLineBy].values[index].toString();
                            tempVisualGroupBy = categorical.categories[idxVisualGroupBy].values[index].toString();
    
                            this.legendLineByCategoryName = categorical.categories[idxLineBy].source.displayName;
                            this.legendVisualGroupingByCategoryName = categorical.categories[idxVisualGroupBy].source.displayName;                        
                        }

                    } 
                    else if (idxTrellisBy != -1) {
                        tempLineBy = categorical.categories[idxTrellisBy].values[index].toString();
                        tempVisualGroupBy = categorical.categories[idxTrellisBy].values[index].toString();
                    }
                    else {
                        tempLineBy = ""
                        tempVisualGroupBy = ""
                    }

                    var tempTrellisBy: string = idxTrellisBy !== -1 ? categorical.categories[idxTrellisBy].values[index].toString() : "1";
                    //console.log('debugLEFT', categorical.values.filter(function(data) { return data.source.roles['measureYLeft'] }));
                    //console.log('debugRIGHT', categorical.values.filter(function(data) { return data.source.roles['measureYRight'] }));
                    this.data.push({
                        //xValue: <number>categoricalValue,
                        xValue: this.xCategoryIsDate ? <number>categoricalValue / 1000 : <number>categoricalValue,
                        //xValueFormatted: tempXValueFormatted,
                        //yValues: GetYValues(categorical.values, index),
                        yValuesLeft: GetYValues(categorical.values.filter(function (data) { return data.source.roles['measureYLeft']; }), index),
                        yValuesRight: GetYValues(categorical.values.filter(function (data) { return data.source.roles['measureYRight']; }), index),
                        lineBy: tempLineBy,
                        visualGroupBy: tempVisualGroupBy,
                        trellisBy: tempTrellisBy,
                        tooltipData: GetTooltipValues(this.tooltipMembers, categorical, index)
                    });
                })

                console.log("data: ");
                console.log(this.data);

                //let measuresLeft = [];
                categorical.values.filter((value) => { return value.source.roles['measureYLeft']; }).forEach((measure) => { this.measuresLeft.push(measure.source.displayName) });
                //let measuresRight = [];
                categorical.values.filter((value) => { return value.source.roles['measureYRight']; }).forEach((measure) => { this.measuresRight.push(measure.source.displayName) });
                //console.log("measures left: ", this.measuresLeft, " measures right: ", this.measuresRight);
                /*
                this.nestedData = d3.nest<ILineChartRow>() 
                    .key(function (d) {
                        return d.lineBy
                    })
                    .entries(this.data);
                console.log("nested data");
                console.log(this.nestedData);
        
                console.log("double NEST:");
        
                
                d3.nest<ILineChartRow>()
                .key(function (d) {
                    return d.trellisBy
                })
                .entries(this.data)
                .forEach((trellisData) => {
                    this.trellisNestedData.push({
                        trellisIndex: trellisData.key,
                        nestedData: d3.nest<ILineChartRow>()
                            .key(function(d){
                                return d.lineBy
                            })
                            .entries(trellisData.values)                
                    })
                });
        */
                if(this.trellisByMeasure)
                {
                    let dataByMeasure = [];
                    this.measuresLeft.forEach((measure, idx) => {
                        let measureData = this.data.map((d) => {

                            let returnRow = {
                                xValue: d.xValue,
                                yValuesLeft: [d.yValuesLeft[idx]],
                                yValuesRight: [],
                                lineBy: d.lineBy,
                                visualGroupBy: d.visualGroupBy,
                                trellisBy: measure,
                                tooltipData: d.tooltipData
                            } as ILineChartRow
                            //console.log("return row: ", returnRow)
                            //return returnRow;
                            if(returnRow.yValuesLeft.length != 0) {
                                return returnRow;
                            }

                        });
                        dataByMeasure = dataByMeasure.concat(measureData);
                    });
                    this.measuresRight.forEach((measure, idx) => {
                        let measureData = this.data.map((d) => {

                            let returnRow = {
                                xValue: d.xValue,
                                yValuesLeft: [],
                                yValuesRight: [d.yValuesRight[idx]],
                                lineBy: d.lineBy,
                                visualGroupBy: d.visualGroupBy,
                                trellisBy: measure,
                                tooltipData: d.tooltipData
                            } as ILineChartRow
                            //console.log("return row: ", returnRow)
                            //return returnRow;
                            if(returnRow.yValuesRight.length != 0) {
                                return returnRow;
                            }

                        });
                        dataByMeasure = dataByMeasure.concat(measureData);
                    });                    
                    
                    d3.nest<ILineChartRow>()
                    .key(function (d) {
                        return d.trellisBy
                    })
                    .entries(dataByMeasure)
                    .forEach((trellisData) => {
                        this.trellisValues.push(trellisData.key);
                        this.nestedData.push(
                            d3.nest<ILineChartRow>()
                                .key(function (d) {
                                    return d.lineBy == null ? "": d.lineBy;
                                })
                                .entries(trellisData.values)
                        )
                    });
                }
                else {
                    d3.nest<ILineChartRow>()
                    .key(function (d) {
                        return d.trellisBy
                    })
                    .entries(this.data)
                    .forEach((trellisData) => {
                        this.trellisValues.push(trellisData.key);
                        this.nestedData.push(
                            d3.nest<ILineChartRow>()
                                .key(function (d) {
                                    return d.lineBy == null ? "": d.lineBy;
                                })
                                .entries(trellisData.values)
                        )
                    });
                }

                //set config
                this.legendByTrellis = this.graphSettings.legendByTrellis && this.nestedData.length > 1;
                //console.log("adjusted trellis by measure: ", this.legendByTrellis)

                //handling for aggregated measures - no line by attribute provided
                /*
                if(this.nestedData.length == 1 && this.nestedData[0][0].key == "null") {
                    this.nestedData[0][0].key = "";
                }
                */

                //build dictiorary for measure values
                //let allMeasures = this.data[0].yValues
                //let measuresAll: string[] = [];
                this.measuresLeft.forEach((measure) => {
                    this.measuresAll.indexOf(measure) === -1 ? this.measuresAll.push(measure) : null;
                });
                this.measuresRight.forEach((measure) => {
                    this.measuresAll.indexOf(measure) === -1 ? this.measuresAll.push(measure) : null;
                });

                /*
                if(!this.graphSettings.distinctMeasureStylesPerTrellis && this.trellisByMeasure) {
                    this.measuresAll.forEach((measure, idx) => {
                        this.measuresDictionary.AddMember(measure, '0');
                    });
                    console.log("measures dict", this.measuresDictionary);
                }
                else {

                    this.measuresAll.forEach((measure, idx) => {
                        this.measuresDictionary.AddMember(measure, idx.toString());
                    });
                    //console.log("measures dict 2", this.measuresDictionary);
                }
                */
               this.measuresAll.forEach((measure, idx) => {
                this.measuresDictionary.AddMember(measure, idx.toString());
                });

                let distinctValues = [];
                this.data.forEach((dataPoint) => {
                    distinctValues.indexOf(dataPoint.visualGroupBy) === -1 ? distinctValues.push(dataPoint.visualGroupBy): null;
                })
                distinctValues.forEach((dValue, idx) => {
                    this.visualGroupByDictionary.AddMember(dValue, idx.toString());
                })
               
                //let originalColourRange = this.colourScale.range();
                //let originalLineByRange = this.lineStyleScale.range();

                /*
                if(this.graphSettings.distinctVisualGroupByStylesPerTrellis) {
                    let distinctValues = [];
                    this.data.forEach((dataPoint) => {
                        distinctValues.indexOf(dataPoint.visualGroupBy) === -1 ? distinctValues.push(dataPoint.visualGroupBy): null;
                    })
                    distinctValues.forEach((dValue, idx) => {
                        this.visualGroupByDictionary.AddMember(dValue, idx.toString());
                    })
                    //
                }
                else {
                    this.nestedData.forEach((trellisData) => {
                        let distinctValuesPerTrellis = [];
                        trellisData.forEach((nestedData) => {
                            nestedData.values.forEach((val) => {
                                distinctValuesPerTrellis.indexOf(val.visualGroupBy) === -1 ? distinctValuesPerTrellis.push(val.visualGroupBy) : null;
                            })
                        })
                        distinctValuesPerTrellis.forEach((dValue, idx) => {
                            this.visualGroupByDictionary.AddMember(dValue, idx.toString());
                        })
                    });
                }
                */

                
                if (this.graphSettings.colourByMeasure) {
                    this.colourScale
                        .domain(this.measuresDictionary.distinctValues);
                        //.domain(rangeMeasuresDict.distinctValues);
                    this.lineStyleScale
                        .domain(this.visualGroupByDictionary.distinctValues);
                        //.domain(rangeVisualGroupByDict.distinctValues);
                }
                else {
                    this.colourScale
                        .domain(this.visualGroupByDictionary.distinctValues);
                        //.domain(rangeVisualGroupByDict.distinctValues);
                    this.lineStyleScale
                        .domain(this.measuresDictionary.distinctValues);
                        //.domain(rangeMeasuresDict.distinctValues);
                }

                //workaround for colour and line styles across trellis charts
                /*
                let rangeMeasuresDict = new Dictionary();
                if(this.trellisByMeasure) {
                    this.measuresAll.forEach((measure, idx) => {
                        rangeMeasuresDict.AddMember(measure, "0");
                    })
                }
                else {
                    rangeMeasuresDict = this.measuresDictionary;
                }
                let rangeVisualGroupByDict = new Dictionary();
                this.nestedData.forEach((trellisData) => {
                    let distinctValuesPerTrellis = [];
                    trellisData.forEach((nestedData) => {
                        nestedData.values.forEach((val) => {
                            distinctValuesPerTrellis.indexOf(val.visualGroupBy) === -1 ? distinctValuesPerTrellis.push(val.visualGroupBy) : null;
                        })
                    })
                    distinctValuesPerTrellis.forEach((dValue, idx) => {
                        rangeVisualGroupByDict.AddMember(dValue, idx.toString());
                    })
                });          
    
                let adjColourRange = [];
                let adjLineByRange = [];
                this.colourScale.range().forEach(colour => adjColourRange.push(colour));
                this.lineStyleScale.range().forEach(lineStyle => adjLineByRange.push(lineStyle));
    
                let colourDict = this.graphSettings.colourByMeasure ? rangeMeasuresDict : rangeVisualGroupByDict;
                let lineStyleDict = this.graphSettings.colourByMeasure ? rangeVisualGroupByDict : rangeMeasuresDict;
    
                colourDict.entries.forEach((entry, idx) => {
                    adjColourRange[idx] = this.colourScale(entry.value);
                })
                lineStyleDict.entries.forEach((entry, idx) => {
                    adjLineByRange[idx] = this.lineStyleScale(entry.value);
                })
                */
                //console.log("colours, original:",this.colourScale.range(),"adjusted:",adjColourRange)
                //console.log("line styles, original:",this.lineStyleScale.range(),"adjusted:",adjLineByRange)
                //this.colourScale.range(adjColourRange);
                //this.lineStyleScale.range(adjLineByRange);
                //end workaround
            }

            if(this.graphSettings.verticalLegend) BuildLegendVertical(this);
            else BuildLegend(this);

            //console.log('aaadD', this.measuresDictionary)
            //VISUALIZATION
            let graphCount = this.nestedData.length;

            //Size
            //let legendWidth = this.legendContainer.node().offsetHeight;
            let legendWidth = parseInt(this.legendContainer.style("width"));
            //let legendHeight = this.legendContainer.node().offsetHeight;
            let legendHeight = parseInt(this.legendContainer.style("height"));

            let widthMod = this.graphSettings.verticalLegend ? legendWidth : 0;
            let heightMod = this.graphSettings.verticalLegend ? 0 : legendHeight;
            let windowWidth = options.viewport.width - widthMod;
            let windowHeight = options.viewport.height - heightMod;

            //this.graphGridContainer.style("width", windowWidth+"px").style("height", windowHeight+"px");

            console.log("measurements", "total width: ", options.viewport.width, "legend width: ", legendWidth, "window width: ", windowWidth)

            //console.log('aspect ratio: '+aspectRatio + " "+sqrtGraphCount);
            //console.log("count : "+graphCount);

            //let yLeftCount = this.data[0].yValuesLeft.length;
            //let yRightCount = this.data[0].yValuesRight.length;
            let yLeftCount: number;
            let yRightCount: number;
            if (this.trellisByMeasure) {
                yLeftCount = this.measuresLeft.length != 0 ? 1: 0;
                yRightCount = this.measuresRight.length != 0 ? 1: 0;
            }
            else {
                yLeftCount = this.measuresLeft.length;
                yRightCount = this.measuresRight.length;
            }

            var margin = { top: this.legendByTrellis ? 40 : 20, right: 15 + 45 * (yRightCount === 0 ? 0 : this.settings.graphSettings.enableMultipleYAxes ? yRightCount : 1), bottom: 60, left: 15 + 45 * (yLeftCount === 0 ? 0 : this.settings.graphSettings.enableMultipleYAxes ? yLeftCount : 1) },
                //width = windowWidth - margin.left - margin.right,
                //height = windowHeight - margin.top - margin.bottom;
                width = windowWidth,
                height = windowHeight;

            let aspectRatio = windowHeight / windowWidth;

            let sqrtGraphCount = Math.sqrt(graphCount);
            let userColumns = this.graphSettings.trellisColumns;
            let columnsCount;
            if(!this.graphSettings.trellisAutoLayout && Number.isInteger(userColumns) && userColumns > 0 && userColumns < 10) {
                columnsCount = userColumns <= graphCount ? userColumns : graphCount;
            }
            else {
                columnsCount = Math.ceil(sqrtGraphCount);
            }
            let rowsCount = Math.ceil((graphCount / columnsCount));

            let childWidth = (width - ((margin.left + margin.right) * columnsCount)) / columnsCount;
            let childHeight = (height - ((margin.top + margin.bottom) * rowsCount)) / rowsCount;

            this.container
                .attr('class', 'grid-container' + columnsCount);

            //this.graphs.push(new Graph(this, width, height, margin));

            console.log("nested data:");
            console.log(this.nestedData);
            console.log(this.nestedData.length);

            //console.log("test condition: ", (this.graphSettings.trellisByMeasure && this.trellisByCategoryName == null))

            this.nestedData.forEach((data, idx) => {

                //let trellisLabel = ((this.trellisByCategoryName === null || this.trellisByCategoryName === this.lineByCategoryName) && !this.graphSettings.trellisByMeasure) ? null : this.trellisValues[idx];
                
                /*
                let trellisLabel;
                if(this.legendByTrellis && ((this.trellisByCategoryName != null && this.trellisByCategoryName == this.lineByCategoryName) || (!this.trellisByMeasure))) {
                    console.log("false123", this.trellisByCategoryName != null && this.trellisByCategoryName == this.lineByCategoryName, "or", !this.trellisByMeasure && !this.legendByTrellis)
                    trellisLabel = null;
                }
                else {
                    trellisLabel = this.trellisValues[idx];
                }
                */
                
                //let trellisLabel;
                /*
                if(this.trellisByCategoryName === null || this.trellisByCategoryName === this.lineByCategoryName) {

                }
                else if(this.trellisByCategoryName === null || this.trellisByCategoryName === this.lineByCategoryName) {

                }
                else {
                    trellisLabel = this.trellisValues[idx];
                }
                */
                //console.log("trellis label: ", trellisLabel)
                let  trellisLabel = this.trellisValues[idx];
                this.graphContainers.push(
                    this.container
                        .append('div')
                        //.attr('width', width / 2)
                        //.attr('height', height / 2)
                        .attr('id', 'graph_Trellis' + (idx.toString()))
                );
                //console.log(childWidth, childHeight)
                let graphMeasureDataTypes = this.graphSettings.trellisByMeasure ? [this.dataTypes[idx]] : this.dataTypes;
                this.graphs.push(new Graph(this, childWidth, childHeight, margin, idx, trellisLabel, graphMeasureDataTypes));
            });

            /*
            var svg = this.container
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform",
                    "translate(" + margin.left + "," + margin.top + ")");
    
            // color palette
            var colourScale = d3.scaleOrdinal()
                .domain(this.data.map(row => row.colourBy))
                .range(['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf', '#999999'])
    
    
            // Add X axis --> it is a date format
            var x = d3.scaleLinear()
                .domain(d3.extent(this.data, function (d) { return d.xValue; }))
                .range([0, width]);
            svg.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x).ticks(5));
    
            // Add Y axis
            var y = d3.scaleLinear()
                .domain([0, d3.max(this.data, function (d) { return +d.yValues[0]; })])
                .range([height, 0]);
            svg.append("g")
                .call(d3.axisLeft(y));
    
    
            // Draw the line
            svg.selectAll(".line")
                .data(this.nestedData)
                .enter()
                .append("path")
                .attr("fill", "none")
                .attr("stroke", function (d) { return colourScale(d.values[0].colourBy) as string })
                .attr("stroke-width", 1.5)
                .attr("class", "lineGroup1")
                .attr("d", function (d) {
                    return d3.line<ILineChartRow>()
                        .x(function (d) { return x(d.xValue); })
                        .y(function (d) { return y(+d.yValues[0]); })
                        (d.values)
    
                }
                );
    
    
    
    
            if (this.data[0].yValues[1]) {
                // second Y Axis
                var y2 = d3.scaleLinear()
                    .domain([0, d3.max(this.data, function (d) { return +d.yValues[1]; })])
                    .range([height, 0]);
                svg.append("g")
                    .attr("transform", "translate(" + width + " ,0)")
                    .attr("class", "lineGroup2")
                    .call(d3.axisRight(y2));
    
                svg.selectAll(".line")
                    .data(this.nestedData)
                    .enter()
                    .append("path")
                    .attr("fill", "none")
                    .attr("stroke", function (d) { return colourScale(d.values[0].colourBy) as string })
                    .attr("stroke-width", 1.5)
                    .attr("class", "lineGroup2")
                    .attr("d", function (d) {
                        return d3.line<ILineChartRow>()
                            .x(function (d) { return x(d.xValue); })
                            .y(function (d) { return y2(+d.yValues[1]); })
                            (d.values)
    
                    }
                    );
            }
    
            
            var sliderContainer = svg.append("g")
            .attr("class", "slider")
            .attr("transform", "translate(-50," + margin.top + ")");
    
            var test = new VerticalRangeSlider(sliderContainer, y);
            */

        }
        else {
            this.dataUpdateExternalFilterOnly = false;
        }
    }

    /*
    private findNearestX(cursorX: number) {
        xValArray = this.xAxis
    }
    */

    private buildFilterArray(filterValues: string[]): any[] {
        let returnArray = [];
        if (this.lineByDataType == 'string' || this.lineByDataType == 'number') {
            filterValues.forEach((value) => {
                let convertedValue = this.lineByDataType == 'string' ? value.toString() : Number(value);
                returnArray.push(convertedValue);
            });
        }
        return returnArray;
    }

    public applyFilter(filterValue: string): boolean {


        let filterValueIndex = this.filterValues.indexOf(filterValue);
        this.dataUpdateExternalFilterOnly = true;

        if (filterValueIndex == -1) {
            this.filterValues.push(filterValue);
        }
        else {
            this.filterValues.splice(filterValueIndex, 1);
        }

        if (this.graphSettings.enableCrossVizFilters) {
            if (this.filterValues.length == 0) {
                this.visualFilter.values.splice(0, this.visualFilter.values.length);
                this.clearFilter();
            }
            else {
                this.visualFilter.values = this.buildFilterArray(this.filterValues);
                this.host.applyJsonFilter(this.visualFilter, "general", "filter", powerbi.FilterAction.merge);
            }
        }

        return (filterValueIndex == -1);

        /*
        let filterValueIndex = this.visualFilter.values.indexOf(filterValue);
        this.dataUpdateExternalFilterOnly = true;

        if (filterValueIndex == -1) {
            this.visualFilter.values.push(filterValue);
        }
        else {
            this.visualFilter.values.splice(filterValueIndex, 1);
        }

        if (this.graphSettings.enableCrossVizFilters) {
            if (this.visualFilter.values.length == 0) {
            
                this.clearFilter();
            }
            else {
                this.host.applyJsonFilter(this.visualFilter, "general", "filter", powerbi.FilterAction.merge);
                
            }
        }
        
        console.log("Filter Values: ",this.visualFilter.values);
        return filterValueIndex == -1 ? true : false;
        */
    }

    public clearFilter() {
        this.host.applyJsonFilter(this.visualFilter, "general", "filter", powerbi.FilterAction.remove);
    }

    private static parseSettings(dataView: DataView): VisualSettings {
        return <VisualSettings>VisualSettings.parse(dataView);
    }

    public IncrementLineStyle(itemName: string, itemCategory: string) {
        /*
        let currentRange = this.lineStyleScale.range();
        let indexOriginalList = this.lineStyles.indexOf(currentRange[lineStyleIndex]);

        let indexNextLineStyle = indexOriginalList + 1 === this.lineStyles.length ? 0 : indexOriginalList + 1;
        let nextLineStyle = this.lineStyles[indexNextLineStyle];

        let newRange = currentRange;
        newRange[lineStyleIndex] = nextLineStyle;

        this.lineStyleScale.range(newRange);
        */
        let currentLineStyle = GetConfigLineStyleValue(this.chartConfig, itemName, itemCategory);
        let currentLineStyleIndex = this.lineStyles.indexOf(currentLineStyle);
        let nextLineStyleIndex = currentLineStyleIndex + 1 === this.lineStyles.length ? 0 : currentLineStyleIndex + 1;
        let nextLineStyle = this.lineStyles[nextLineStyleIndex];

        UpdateLineStyleValue(this.chartConfig, itemName, itemCategory, nextLineStyle);
        SaveConfig(this.host, this.chartConfig);
        this.update(this.OPTIONS);
    }

    public IncrementColour(itemName: string, itemCategory: string) {
        /*
        let currentRange = this.colourScale.range();
        let indexOriginalList = this.colours.indexOf(currentRange[colourIndex]);

        let indexNextColour = indexOriginalList + 1 === this.colours.length ? 0 : indexOriginalList + 1;
        let nextColour = this.colours[indexNextColour];

        let newRange = currentRange;
        newRange[colourIndex] = nextColour;

        this.colourScale.range(newRange);
        */
        //console.log("increment colour called")
       let currentColour = GetConfigColourValue(this.chartConfig, itemName, itemCategory);
       let currentColourIndex = this.colours.indexOf(currentColour);
       let nextColourIndex = currentColourIndex + 1 === this.colours.length ? 0 : currentColourIndex + 1;
       let nextColour = this.colours[nextColourIndex];

       UpdateColourValue(this.chartConfig, itemName, itemCategory, nextColour);
       SaveConfig(this.host, this.chartConfig);
       this.update(this.OPTIONS);
    }

    public ResetLineStyles() {
        //this.lineStyleScale.range(this.lineStyles);
        this.chartConfig.lineStyles = [];
        SaveConfig(this.host, this.chartConfig);
        this.update(this.OPTIONS);
    }

    public ResetColours() {
        //this.colourScale.range(this.colours);
        this.chartConfig.dataColours = [];
        SaveConfig(this.host, this.chartConfig);
        this.update(this.OPTIONS);
    }

    public ShowLegendTooltip(tooltipText: string, x: number, y: number) {

        this.legendTooltipText.text(tooltipText);
        this.MoveLegendTooltip(x, y);
        this.legendTooltipContainer.style("visibility", "visible");
        //this.HideLegendTooltip();
    }

    public MoveLegendTooltip(x: number, y: number) {

        let textWidth = this.legendTooltipText.node().getBoundingClientRect().width;
        let textHeight = this.legendTooltipText.node().getBoundingClientRect().height;
        let rightBound = this.OPTIONS.viewport.width;
        let bottomBound = this.OPTIONS.viewport.height;

        let legendX = x + textWidth <= rightBound ? x + 20 : x - textWidth - 20;
        let legendY = y + textHeight <= bottomBound ? y + 20 : y - textHeight - 20;

        this.legendTooltipContainer
        .attr("transform",
        "translate(" + legendX + ", " + legendY + ")");

    }

    public HideLegendTooltip() {
        this.legendTooltipContainer.style("visibility", "hidden");
    }

    public SelectLines(line: string) {

        let filterApplied = line !== null ? this.applyFilter(line): false;
        this.graphs.forEach(graph => {
            graph.SelectLine(line);
        })
    }

    public GetColour(name: string, type: string): string {
        let configColour = GetConfigColourValue(this.chartConfig, name, type);
        // Return colour if item already exists in config
        if(configColour) return configColour;
        // Otherwise, update config & save
        else {
            let newColour = AssignNewColourValue(this.chartConfig, this.colours, type)

            AddConfigColourValue(this.chartConfig, name, type, newColour);
            SaveConfig(this.host, this.chartConfig);

            return newColour;
        }
    }

    public GetLineStyle(name: string, type: string): string {
        let configLineStyle = GetConfigLineStyleValue(this.chartConfig, name, type);
        // Return colour if item already exists in config
        if(configLineStyle) return configLineStyle;
        // Otherwise, update config & save
        else {
            let newLineStyle = AssignNewLineStyleValue(this.chartConfig, this.lineStyles, type)

            AddConfigLineStyleValue(this.chartConfig, name, type, newLineStyle);
            SaveConfig(this.host, this.chartConfig);

            return newLineStyle;
        }
    }
    

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */
    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        //console.log("options: ", options)
        const instances: VisualObjectInstance[] = (VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options) as VisualObjectInstanceEnumerationObject).instances;
        //console.log(instances)
        //return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
        let objectName = options.objectName;
        //console.log('test instances: ', instances)
        /*
        switch (objectName) { 


            case 'dataColors': {
                this.dataColors.forEach((dataColor) => {
                    instances.push({
                        objectName: objectName,
                        displayName: dataColor.name,
                        properties: {
                            fill: dataColor.color
                        },
                        selector: null
                    })
                }) 
            }

            case 'lineStyles': {

            }

        }
        */

        return instances;
    }
}




  
  