interface INameValuePair {
    name: string;
    value: string;
}
export declare class Dictionary {
    entries: INameValuePair[];
    distinctValues: string[];
    constructor();
    Value(name: string): string;
    AddMember(name: string, value: string): void;
    Clear(): void;
}
export {};
