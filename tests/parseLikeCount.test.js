const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const script = fs.readFileSync(path.join(__dirname, "../src/like_parser.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(script, context);

const parseLikeCount = context.window.XLTF.parseLikeCount;

const cases = [
  ["1 Like", 1],
  ["12 Likes", 12],
  ["1,234 Likes", 1234],
  ["12.3K Likes", 12300],
  ["9.9K", 9900],
  ["1.2M", 1200000],
  ["3M Likes", 3000000],
  ["0", 0],
  ["", null],
  ["Like", null]
];

cases.forEach(([input, expected]) => {
  assert.strictEqual(parseLikeCount(input), expected, `Failed for ${input}`);
});

console.log("parseLikeCount tests passed");
