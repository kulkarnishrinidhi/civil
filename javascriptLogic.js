const { isEmpty, isUndefined, find } = require("lodash");
const util = require("util");

// B -> D -> E -> F
const CSV_DATA = [
  {
    activity: "a",
    predecessors: null,
    duration: 7,
  },
  {
    activity: "b",
    predecessors: null,
    duration: 9,
  },
  {
    activity: "c",
    predecessors: ["a"],
    duration: 12,
  },
  {
    activity: "d",
    predecessors: ["a", "b"],
    duration: 8,
  },
  {
    activity: "e",
    predecessors: ["d"],
    duration: 9,
  },
  {
    activity: "f",
    predecessors: ["c", "e"],
    duration: 6,
  },
  {
    activity: "g",
    predecessors: ["e"],
    duration: 5,
  },
];

class Node {
  constructor(activity) {
    this.activity = activity;
    this.duration = null;
    this.ES = null;
    this.EF = null;
    this.LS = null;
    this.LF = null;

    //CP
    this.CP = "";
    this.isOnCriticalPath = null;
    // relatioship

    this.lag = null;
    //slack
    this.slack = null;

    //pointers
    this.next = [];
    this.prev = [];
  }
}

const node_dict = {};

CSV_DATA.forEach((item) => {
  const activity = item.activity;
  let node = node_dict?.[activity];

  if (isEmpty(node)) {
    node = new Node(activity);
    node_dict[activity] = node;
  }
  node.duration = item.duration;
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

function backward(node) {
  let min = 30000000;
  node?.next.forEach((next) => {
    if (next.LS === null) {
      backward(next);
    }
    if (next.LS < min) {
      min = next.LS;
    }
  });

  if (isEmpty(node.next)) {
    min = node.EF;
  }

  node.LF = min;
  node.LS = node.LF - node.duration;

  const slack = node.LS - node.ES;
  const isOnCriticalPath = slack === 0;
  node.slack = slack;
  node.CP = isOnCriticalPath ? "Yes" : "NO";
  node.isOnCriticalPath = isOnCriticalPath;
}

function computeSlack() {
  for (const activity in node_dict) {
    const node = node_dict[activity];
    const slack = node.LS - node.ES;
    const isOnCriticalPath = slack === 0;
    node.slack = slack;
    node.CP = isOnCriticalPath ? "Yes" : "NO";
    node.isOnCriticalPath = isOnCriticalPath;
  }
}

const start = new Node("start");
start.ES = 0;
start.EF = 0;
start.LS = 0;
start.LF = 0;
start.duration = 0;

const end = new Node("end");
end.duration = 0;

for (const activity in node_dict) {
  //console.log(`${activity}: ${node_dict[activity]}`);
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

// function getNextNode()

//computeSlack();
// console.log(
//   util.inspect(node_dict, { showHidden: false, depth: 2, colors: true })
// );

//console.log(util.inspect(end, { showHidden: false, depth: 2, colors: true }));
//console.log(node_dict);
// console.log(
//   util.inspect(node_dict, { showHidden: false, depth: null, colors: true })
// );
// console.log(
//   util.inspect(node_dict, { showHidden: false, depth: null, colors: true })
// );
var criticalPath = "start-";
function findPath(node) {
  if (isEmpty(node)) {
    // criticalPath += "end";
    return;
  }
  for (let child of node) {
    if (!isEmpty(child?.next) && child.isOnCriticalPath) {
      criticalPath += child?.activity + "-";
      findPath(child.next);
    }
  }
}
findPath(start.next);
console.log(criticalPath, "critical path");
