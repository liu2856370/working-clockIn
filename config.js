const PUSH_PLUS_TOKEN = "fbb19de6491e4448859597359f3449e0"; //*必须修改，否则无法接收微信推送， pushPlus 的用户 token，官网：https://pushplus.hxtrip.com/
const USER_NAME = "$USER_NAME"; //*必须修改， 设置登录用户名
const PASS_WORD = "Zr!@#123"; // *必须修改，设置登录密码
const START_REMIND_TIME = 30; // 开始提醒签到的时间，这里只需要填写分钟，起始时间为九点，即每天9:30开始发送签到提醒
const REMIND_INTERVAL = 300; // 提醒签到的时间间隔，单位为秒（自动查询签到结果，签到成功不在发送提醒）,设置为0则关闭签到提醒
const CHECK_IN_LATEST_TIME = 48; // 签到的最晚时间，这里只需要填写分钟，起始时间为九点
const WORING_TIME = 8.5; // 工作时长，即在签到时间基础上增加8.5小时打卡（实际为8.5上下的随机数并增加1小时的午休时长）
const CHECK_Out_LATEST_TIME = {
  // 签退的最晚时间，和工作时长互相冲突，只需开启一项
  enable: false, // 如果开启此选项则会使用下面设定的固定时间签退
  hours: 19,
  minutes: 30,
};
const CLOCK_IN_IP = "223.70.159.3"; // 设置打卡的 IP 地址
// sed -i '' 's/test/test/g' config.js
module.exports = {
  PUSH_PLUS_TOKEN,
  START_REMIND_TIME,
  REMIND_INTERVAL,
  CHECK_IN_LATEST_TIME,
  WORING_TIME,
  CLOCK_IN_IP,
  USER_NAME,
  PASS_WORD,
  CHECK_Out_LATEST_TIME,
};
