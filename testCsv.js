const csv = require('csvtojson/v2')

async function readCsv() {
    return csv().fromFile('./Assignment_1_2022.csv');
}

const jsonArray= await csv().fromFile('Assignment_1_2022.csv')
console.log(jsonArray)