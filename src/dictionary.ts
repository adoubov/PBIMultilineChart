"use strict";

interface INameValuePair {
    name: string,
    value: string
}


export  class Dictionary {

    public entries: INameValuePair[];
    public distinctValues: string[];

    constructor(){
        this.entries = [];
        this.distinctValues = [];
    }

    public Value (name: string): string {
        return this.entries.find((member) => { return member.name === name; }).value;
    }

    public AddMember(name: string, value: string): void {
        this.entries.push({name: name, value: value});
        !this.distinctValues.some((distinctValue) => {distinctValue === value}) ? this.distinctValues.push(value): null;
    }

    public Clear(): void {
        this.entries.splice(0, this.entries.length);
        this.distinctValues.splice(0, this.distinctValues.length);
    }
}