var axios = require("axios");
var { PUSH_PLUS_TOKEN } = require("../config.js");
const send = async ({ title, content }) => {
  await axios.post("http://pushplus.hxtrip.com/send", {
    token: PUSH_PLUS_TOKEN,
    title,
    content,
  });
};
module.exports = send;
