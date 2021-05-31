var axios = require("axios");
const send = async ({ title, content }) => {
  await axios.post("http://pushplus.hxtrip.com/send", {
    token: "fbb19de6491e4448859597359f3449e0 ",
    title,
    content,
  });
};
module.exports = send;
