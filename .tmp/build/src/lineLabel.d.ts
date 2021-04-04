import "core-js/stable";
import "./../style/visual.less";
import { Graph } from "./graph";
export declare class LineLabel {
    private parentGraph;
    private svg;
    private line;
    private lineLabel;
    private labelText;
    private labelVisible;
    private bounds;
    private labelWidth;
    private labelHeight;
    private labelX;
    private labelY;
    constructor(parentGraph: Graph, labelText: string, labelX: number, labelY: number);
    private renderLabel;
    private moveLabel;
}
