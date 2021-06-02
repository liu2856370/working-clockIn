var axios = require("axios");
const PUSH_PLUS_TOKEN = process.env.PUSH_PLUS_TOKEN;
const send = async ({ title, content }) => {
  await axios.post("http://pushplus.hxtrip.com/send", {
    token: PUSH_PLUS_TOKEN,
    title,
    content,
  });
};
module.exports = send;
