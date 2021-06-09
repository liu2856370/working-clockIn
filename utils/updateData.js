const fs = require("fs");
const path = require("path");
fs.readFile(path.join(__dirname, "./data.json"), "utf8", function (err, data) {
  console.log(data);
});
const updateData = (key, val) => {
  fs.readFile(
    path.join(__dirname, "./data.json"),
    "utf8",
    function (err, data) {
      if (err) throw err;
      let result = JSON.parse(data);
      console.log(result);
      result[key] = val;
      fs.writeFile(
        path.join(__dirname, "./data.json"),
        JSON.stringify(result),
        "utf8",
        (err) => {
          if (err) throw err;
          console.log("success done");
        }
      );
    }
  );
};
fs.readFile(path.join(__dirname, "./data.json"), "utf8", function (err, data) {
  console.log(data);
});
module.exports = updateData;
