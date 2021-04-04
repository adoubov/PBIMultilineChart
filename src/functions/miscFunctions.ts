export function GetArrayDistinctValues (inputArray: any[]): any[] {
    
    let returnArray = [];
    if(inputArray == null || inputArray.length == 1) {
        return returnArray;
    }
    else {
        inputArray.forEach(member => {
            if(returnArray.indexOf(member) == -1) returnArray.push(member);
        })
        return returnArray;
    }

}