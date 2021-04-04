import powerbi from "powerbi-visuals-api";
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
interface IChartConfigSettings {
    dataColours: IChartConfigValue[];
    lineStyles: IChartConfigValue[];
}
interface IChartConfigValue {
    name: string;
    type: string;
    value: string;
}
export declare function GetConfig(host: IVisualHost, metadata: powerbi.DataViewMetadata): IChartConfigSettings;
export declare function GetConfigColourValue(config: IChartConfigSettings, name: string, type: string): string;
export declare function GetConfigLineStyleValue(config: IChartConfigSettings, name: string, type: string): string;
export declare function AddConfigColourValue(config: IChartConfigSettings, name: string, type: string, value: string): void;
export declare function AddConfigLineStyleValue(config: IChartConfigSettings, name: string, type: string, value: string): void;
export declare function AssignNewColourValue(config: IChartConfigSettings, allColours: string[], type: string): string;
export declare function AssignNewLineStyleValue(config: IChartConfigSettings, allLineStyles: string[], type: string): string;
export declare function SaveConfig(host: IVisualHost, config: IChartConfigSettings): void;
export declare function UpdateColourValue(config: IChartConfigSettings, itemName: string, itemCategory: string, colour: string): void;
export declare function UpdateLineStyleValue(config: IChartConfigSettings, itemName: string, itemCategory: string, lineStyle: string): void;
export {};
