const START_REMIND_TIME = "30"; // 开始提醒签到的时间，这里只需要填写分钟，起始时间为九点，即每天9:30开始发送签到提醒
const REMIND_INTERVAL = "120"; // 提醒签到的时间间隔，单位为秒（自动查询签到结果，签到成功不在发送提醒）
const CLOCK_IN_LATEST_TIME = "48"; // 签到的最晚时间，这里只需要填写分钟，起始时间为九点
const CHECK_OUT_INTERVAL = "8.5"; // 工作时长，即在签到时间基础上增加8.5小时打卡（实际为8.5上下的随机数）
const CLOCK_IN_IP = "223.70.159.3"; // 设置打卡的 IP 地址
const USER_NAME = "15557881220"; // 设置登录用户名
const PASS_WORD = "Zr!@#123"; // 设置登录密码
module.exports = {
  START_REMIND_TIME,
  REMIND_INTERVAL,
  CLOCK_IN_LATEST_TIME,
  CHECK_OUT_INTERVAL,
  CLOCK_IN_IP,
  USER_NAME,
  PASS_WORD,
};
