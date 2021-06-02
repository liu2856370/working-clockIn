const CHECK_IN_CONFIG = {
  ENABLE_REMIND: true, // 是否开启签到提醒
  REMIND_INTERVAL: 5, // 签到提醒的时间间隔，单位为分钟
  START_REMIND_TIME: 30, // 签到提醒的开始时间（填写分钟，hours默认为9，不可更改）,即每天9:30开始发送签到提醒
  LATEST_TIME: 48, // 最后的签到时间，在此之前只会发送提醒，并且手动签到后不会再自动签到
};
const CHECK_OUT_CONFIG = {
  ENABLE_REMIND: true, // 是否开启签到提醒，工作时长满8h 后开始提醒，不用设置提醒时间
  REMIND_INTERVAL: 10, // 签到提醒的时间间隔，单位为分钟
  LATEST_TIME: {
    enable: false, // 如果开启此选项则会使用下面设定的固定时间签退
    hours: 19, // 签退时间-hours
    minutes: 30, // 签退时间-minutes
  },
};

const WORING_TIME = 8; // 工作时长，即在签到时间基础上增加8.5小时打卡（实际为8.5上下的随机数并增加1小时的午休时长）

const CLOCK_IN_IP = "223.70.159.3"; // 设置打卡的 IP 地址
module.exports = {
  CHECK_IN_CONFIG,
  CHECK_OUT_CONFIG,
  WORING_TIME,
  CLOCK_IN_IP,
};
