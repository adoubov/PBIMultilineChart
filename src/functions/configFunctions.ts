import powerbi from "powerbi-visuals-api";
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualObjectInstancesToPersist = powerbi.VisualObjectInstancesToPersist;

interface IChartConfigSettings {
    dataColours: IChartConfigValue []
    lineStyles: IChartConfigValue []
}

interface IChartConfigValue {
    name: string
    type: string
    value: string
}

export function GetConfig(host: IVisualHost, metadata: powerbi.DataViewMetadata): IChartConfigSettings {

    let returnConfig: IChartConfigSettings;
    // Check if valid config metadata object exists
    if(metadata && metadata.hasOwnProperty('objects') && metadata.objects.hasOwnProperty('internalState') && metadata.objects["internalState"].hasOwnProperty('graphConfig')) {
        returnConfig = JSON.parse(metadata.objects["internalState"]["graphConfig"] as string) as IChartConfigSettings;
    }
    // If no existing config data exists, create a new config object
    
    else {
        returnConfig = {dataColours:[], lineStyles: []}
        SaveConfig(host, returnConfig);
    }

    return returnConfig;

}

export function GetConfigColourValue(config: IChartConfigSettings, name: string, type: string): string {
    let configItem = config.dataColours.find((member) => { return (member.type == type && member.name == name)  });
    if(configItem) return configItem.value;
    return null;
}

export function GetConfigLineStyleValue(config: IChartConfigSettings, name: string, type: string): string {
    let configItem = config.lineStyles.find((member) => { return (member.type == type && member.name == name) });
    if(configItem) return configItem.value;
    return null;
}

export function AddConfigColourValue(config: IChartConfigSettings, name: string, type: string, value: string): void {
    config.dataColours.push({name: name, type: type, value: value});
}

export function AddConfigLineStyleValue(config: IChartConfigSettings, name: string, type: string, value: string): void {
    config.lineStyles.push({name: name, type: type, value: value});
}

export function AssignNewColourValue(config: IChartConfigSettings, allColours: string[], type: string): string {
    // Get listing of unique currently-assigned values
    let currentlyAssigned = config.dataColours.filter(item => {return item.type == type}).map(item => {return item.value}).filter(onlyUnique);

    // If all values assigned, assign random value
    if(currentlyAssigned.length == allColours.length) return allColours[Math.floor(Math.random() * allColours.length)];
    // Otherwise, return first unassigned value
    return allColours.find(colour => {return currentlyAssigned.indexOf(colour) == -1});
}

export function AssignNewLineStyleValue(config: IChartConfigSettings, allLineStyles: string[], type: string): string {
    // Get listing of unique currently-assigned values
    let currentlyAssigned = config.lineStyles.filter(item => {return item.type == type}).map(item => {return item.value}).filter(onlyUnique);

    // If all values assigned, assign random value
    if(currentlyAssigned.length == allLineStyles.length) return allLineStyles[Math.floor(Math.random() * allLineStyles.length)];
    // Otherwise, return first unassigned value
    return allLineStyles.find(lineStyle => {return currentlyAssigned.indexOf(lineStyle) == -1});
}

export function SaveConfig(host: IVisualHost, config: IChartConfigSettings) {
    //console.log("updating visual bla2");
    host.persistProperties(<VisualObjectInstancesToPersist>{
        merge: [{
            objectName: "internalState",
            selector: null,
            properties: {
                graphConfig: JSON.stringify(config) || ""
            }
        }]
    });
}

export function UpdateColourValue(config: IChartConfigSettings, itemName: string, itemCategory: string, colour: string) {
    config.dataColours.find(item => {return item.type == itemCategory && item.name == itemName}).value = colour;
}

export function UpdateLineStyleValue(config: IChartConfigSettings, itemName: string, itemCategory: string, lineStyle: string) {
    config.lineStyles.find(item => {return item.type == itemCategory && item.name == itemName}).value = lineStyle;
}


function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}