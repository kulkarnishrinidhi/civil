let csvToJson = require('convert-csv-to-json');

// csvToJson.getJsonFromCsv("Assignment_1_2022.csv");
 let json = csvToJson.parseSubArray(',').getJsonFromCsv('Assignment_1_2022.csv');
console.log(json)