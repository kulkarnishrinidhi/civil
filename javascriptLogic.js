// lodash is utility library
const { isEmpty } = require("lodash");
// csvtojson is a library to read contents of csv file
const CSVToJSON = require('csvtojson')

const { Console } = require('console');
const { Transform } = require('stream');

function table(input) {
    // @see https://stackoverflow.com/a/67859384
    const ts = new Transform({ transform(chunk, enc, cb) { cb(null, chunk) } })
    const logger = new Console({ stdout: ts })
    logger.table(input)
    const table = (ts.read() || '').toString()
    let result = '';
    for (let row of table.split(/[\r\n]+/)) {
        let r = row.replace(/[^┬]*┬/, '┌');
        r = r.replace(/^├─*┼/, '├');
        r = r.replace(/│[^│]*/, '');
        r = r.replace(/^└─*┴/, '└');
        r = r.replace(/'/g, ' ');
        result += `${r}\n`;
    }
    console.log(result);
}

// Node represents blueprint of an activity
class Node {
    constructor(activity) {
        this.activity = activity;
        this.duration = null;
        this.ES = null;
        this.EF = null;
        this.LS = null;
        this.LF = null;

        //Critical path
        this.CP = "";
        this.isOnCriticalPath = null;

        // relatioship
        this.lag = null;

        //slack
        this.slack = null;
        //freeFloat
        this.freeFloat = null;

        //pointers next = successor activities and prev = predecessor activities
        this.next = [];
        this.prev = [];
    }
}

// Logic for forwards pass to calculate ES and EF
// This function uses recursion strategy to find ES and EF
function forward(node) {
    let max = 0;
    if (!isEmpty(node?.prev)) {
        node.prev.forEach((prev) => {
            if (prev.EF === null) {
                forward(prev);
            }
            if (prev.EF > max) {
                max = prev.EF;
            }
        });
    }

    node.ES = max;
    node.EF = node.ES + node.duration;
}

// Logic for Backward pass to calculate LS and LF
// This function uses recursion strategy to find LS and LF
function backward(node) {
    let min = 30000000;
    let minES = 3000000;
    node?.next.forEach((next) => {
        if (next.LS === null) {
            backward(next);
        }
        if (next.LS < min) {
            min = next.LS;
        }
        if (next.ES < minES) {
            minES = next.ES;
        }
    });

    if (isEmpty(node.next)) {
        min = node.EF;
    }

    node.LF = min;
    node.LS = node.LF - node.duration;

    const slack = node.LS - node.ES;
    const freeFloat = minES - node.ES - node.duration;
    const isOnCriticalPath = slack === 0;
    node.slack = slack;
    node.freeFloat = freeFloat;
    node.CP = isOnCriticalPath ? "Yes" : "NO";
    node.isOnCriticalPath = isOnCriticalPath;
}

function buildDataStream({ csvData }) {
    const node_dict = {};
    csvData.forEach((item) => {
        const activity = item.activity;
        let node = node_dict?.[activity];

        if (isEmpty(node)) {
            node = new Node(activity);
            node_dict[activity] = node;
        }
        node.duration = parseInt(item.duration);
        const depends = item.predecessors;

        if (!isEmpty(depends)) {
            depends.forEach((predecessor) => {
                if (predecessor) {
                    let node_prev = node_dict?.[predecessor];
                    if (isEmpty(node_prev)) {
                        // if empty
                        node_prev = new Node(predecessor);
                        node_dict[predecessor] = node_prev;
                    }
                    node.prev.push(node_prev);
                    node_prev.next.push(node);
                }
            });
        }
    });
    return node_dict
}

function getStartAndEndObj(node_dict) {
    const start = new Node("start");
    start.ES = 0;
    start.EF = 0;
    start.LS = 0;
    start.LF = 0;
    start.duration = 0;

    const end = new Node("end");
    end.duration = 0;

    for (const activity in node_dict) {
        const node = node_dict[activity];
        if (isEmpty(node.prev)) {
            start.next.push(node);
            node.prev.push(start);
        }

        if (isEmpty(node.next)) {
            end.prev.push(node);
            node.next.push(end);
        }
    }

    forward(end);

    end.LS = end.ES;
    end.EF = end.ES;
    end.LF = end.ES;

    backward(start);

    return { start, end }
}

var criticalPath = [];
function findPath(node) {
    if (isEmpty(node)) {
        // criticalPath += "end";
        return;
    }
    for (let child of node) {
        if (!isEmpty(child?.next) && child.isOnCriticalPath) {
            criticalPath.push(child?.activity);
            findPath(child.next);
        }
    }
}

//Reading input from CSV file
CSVToJSON()
    .fromFile('example.csv')
    .then(tasks => {
        const CSV_DATA = tasks.map(task => {
            const { Activity: activity, Duration: duration } = task
            const Depends = task['Depends on']
            const newTask = {
                activity,
                duration,
                predecessors: Depends === '---' ? null : Depends.split(',')
            }

    console.log(newTask)
            return newTask
        });

        const node_dict = buildDataStream({ csvData: CSV_DATA })

        const { start, end } = getStartAndEndObj(node_dict)

        findPath(start.next);

        const tableData = Object.values(node_dict).map((node) => {
            return {
                'Activity': node.activity,
                'Duration': node.duration,
                'ES': node.ES,
                'EF': node.EF,
                'LS': node.LS,
                'LF': node.LF,
                'TF': node.slack, // TF
                'FF': node.freeFloat, // FF
                'CP': node.CP
            }
        })
        console.log(`Project duration is: ${end.LF}`)
        console.log(`Critical Path is: ${criticalPath.join('-')}`)
        table(tableData)
        
    })
    .catch(err => {
        // log error if any
        console.log(err)
    })