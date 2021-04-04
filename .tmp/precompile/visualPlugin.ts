import { Visual } from "../../src/visual";
import powerbiVisualsApi from "powerbi-visuals-api"
import IVisualPlugin = powerbiVisualsApi.visuals.plugins.IVisualPlugin
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions
var powerbiKey: any = "powerbi";
var powerbi: any = window[powerbiKey];

var pocMultilineChartE1FCCAEA8C414E89A5387A2B74B2AED6_DEBUG: IVisualPlugin = {
    name: 'pocMultilineChartE1FCCAEA8C414E89A5387A2B74B2AED6_DEBUG',
    displayName: 'Data Civ MultiAxis Trellis Chart',
    class: 'Visual',
    apiVersion: '2.6.0',
    create: (options: VisualConstructorOptions) => {
        if (Visual) {
            return new Visual(options);
        }

        throw 'Visual instance not found';
    },
    custom: true
};

if (typeof powerbi !== "undefined") {
    powerbi.visuals = powerbi.visuals || {};
    powerbi.visuals.plugins = powerbi.visuals.plugins || {};
    powerbi.visuals.plugins["pocMultilineChartE1FCCAEA8C414E89A5387A2B74B2AED6_DEBUG"] = pocMultilineChartE1FCCAEA8C414E89A5387A2B74B2AED6_DEBUG;
}

export default pocMultilineChartE1FCCAEA8C414E89A5387A2B74B2AED6_DEBUG;