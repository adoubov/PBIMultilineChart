import { YAxis } from './yAxis';
import { XAxis } from './xAxis';
export declare class VerticalRangeSlider {
    parentYAxis: YAxis;
    private sliderScale;
    private handleTopY;
    private handleBottomY;
    private handleTop;
    private handleBottom;
    private mouseoverHandler;
    private sliderId;
    constructor(parentYAxis: YAxis);
    private initSlider;
    private moveHandle;
}
export declare class HorizontalRangeSlider {
    parentXAxis: XAxis;
    private sliderScale;
    private handleLeftX;
    private handleRightX;
    private handleLeft;
    private handleRight;
    private mouseoverHandler;
    constructor(parentXAxis: XAxis);
    private initSlider;
    private moveHandle;
}
