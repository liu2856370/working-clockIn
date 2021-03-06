const puppeteer = require("puppeteer");
var axios = require("axios");
var schedule = require("node-schedule");
var send = require("./utils/send.js");
const dayjs = require("dayjs");
const USER_NAME = process.env.USER_NAME;
const PASS_WORD = process.env.PASS_WORD;
require("jsonc-require");
const config = require("./config.jsonc");
const { CHECK_IN_CONFIG, CHECK_OUT_CONFIG, CLOCK_IN_IP, WORING_TIME } = config;
const LUNCH_TIME = 1; // 午休时间，默认1小时，无需修改
global.checkOutJob = null; // 签退任务
global.checkInJob = null; // 签到任务
global.checkOutRemindJob = null; // 提醒签退
global.checkOutRemindTimer = null; // 提醒签退定时器
global.checkInRemindTimer = null; // 提醒签到定时器
global.reloadTimer = null; // 刷新浏览器定时器
global.leaveEarly = false; // 是否早退
global.isAutoCheckIn = false; // 是否自动签到
global.isAutoCheckOut = false; // 是否自动签退

const reviseTime = (time) => +(time + 28800000) || null;
const exitScript = () => {
  clearInterval(global.checkOutRemindTimer);
  clearInterval(global.checkInRemindTimer);
  clearInterval(global.reloadTimer);
  global.checkOutRemindJob?.cancel();
  global.checkInJob?.cancel();
  global.checkOutJob?.cancel();
  setTimeout(() => {
    process.exit(main);
  }, 3000);
};
const main = async () => {
  //启动浏览器
  const browser = await puppeteer.launch({
    headless: true, // 是否以无头模式运行, 默认ture. 无头就是不打开Chrome图形界面, 更快.
  });
  const page = await browser.newPage(); // 打开一个页面, page就是后序将要操作的
  page.setDefaultNavigationTimeout(120000); // 设置页面的打开超时时间, 因为我要打卡的是学校的垃圾服务器, 超时时间设置了2分钟
  try {
    //页面跳转, 第二个参数为可选options, 这里表示等待页面结构加载完成, 无需等待img等资源
    await page.goto("https://www.eteams.cn/attend", {
      waitUntil: "domcontentloaded",
    });
    // 登陆
    await page.evaluate(
      ({ USER_NAME, PASS_WORD }) => {
        document.querySelector("#username").value = USER_NAME; //用户名input
        document.querySelector("#password").value = PASS_WORD; //用户名input
        document.querySelector("#loginForm > div.login-btn > button").click();
      },
      { USER_NAME, PASS_WORD },
    );
    await page.waitForNavigation(); //因为要跳转页面, 所以这里等待页面导航
    await page.waitForSelector(".j_check_inOrOut");
    console.log("已进入签到页面！！！");
    const clockIn = async () => {
      console.log("调用签到/签退方法！");
      await page.evaluate(async () => {
        console.log("进入打卡函数");
        const today = moment().format("YYYY-MM-DD");
        console.log(today);
        setTimeout(() => {
          // 未签到
          if (document.querySelector(".j_check_inOrOut").innerText == "签到") {
            console.log("签到");
            document.querySelector(".j_check_inOrOut").click();
          } else if (
            document.querySelector(`.j_miss-tab div.content-info[attendday='${today}']`) ||
            document.querySelector(`.j_leaveEarly-tab div.content-info[attendday='${today}']`)
          ) {
            // 未签退
            console.log("签退");
            document.querySelector(".j_check_inOrOut").click();
          }
        }, 3000);
      });
    };
    if (!global.reloadTimer) {
      global.reloadTimer = setInterval(() => {
        page.reload();
        console.log("刷新浏览器");
      }, (Math.random() * 3).toFixed(2) * 60 * 1000);
    }
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      let isTargetUrl = request._url.startsWith("https://www.eteams.cn/attendapp/timecard/check.json");
      if (isTargetUrl) {
        request.continue({
          headers: {
            ...request._headers,
            "X-Forwarded-For": CLOCK_IN_IP || "223.70.159.3",
          },
        });
        return;
      }
      request.continue();
    });

    page.on("response", async (response) => {
      const check_url = "https://www.eteams.cn/attendapp/timecard/check.json";
      if (response._url.includes(check_url)) {
        const res = await response.json();
        if (res.checkMap.message.includes("签到成功")) {
          console.log("脚本自动签到成功！");
          global.isAutoCheckIn = true; // 是否自动签到
          clearInterval(global.checkInRemindTimer);
          clearInterval(global.reloadTimer);
        }
        if (res.checkMap.message.includes("签退成功")) {
          console.log("脚本自动签退成功！");
          global.isAutoCheckOut = true; // 是否自动签退
        }
      }
      const status_url = "https://www.eteams.cn/attendapp/timecard/queryAttendStatus.json";
      if (response._url == status_url) {
        let res;
        try {
          res = await response?.json();
        } catch (error) {
          return;
        }
        let checkInTime = reviseTime(res?.beginDate) || +dayjs().hour(9).minute(55);
        // 如果没有签到，每30秒发送一次提醒
        if (!res.beginDate) {
          const expectCheckInTime = +dayjs().hour(9).minute(CHECK_IN_CONFIG.LATEST_TIME);
          // 启动定时任务
          if (!global.checkInJob) {
            console.log("检测到暂未签到");
            console.log("启动定时签到 Job");
            global.checkInJob = schedule.scheduleJob(+expectCheckInTime, clockIn);
          }
          // 容错处理，如果启动时间已经超过了最后打卡时间，直接执行
          if (dayjs().hour() + 8 == 9 && dayjs().minute() >= 50) {
            console.log("定时签到时间已过，开始签到");
            global.checkInJob = null;
            clockIn();
          }
          // 签到提醒，如果没有签到，在时间段内提醒
          if (!global.checkInRemindTimer && CHECK_IN_CONFIG.ENABLE_REMIND) {
            const sendCheckInRemind = () => {
              if (dayjs().hour() + 8 != 9) return;
              if (
                dayjs().minute() >= CHECK_IN_CONFIG.START_REMIND_TIME &&
                dayjs().minute() <= CHECK_IN_CONFIG.LATEST_TIME
              ) {
                console.log("发送签到提醒！");
                send({
                  title: "签到提醒：请及时签到！！！",
                  content: `
                  <h3 style="color:red">今天是工作日，请及时签到！</h3>
                  <a href="https://www.eteams.cn/attend">点击链接手动打卡</a>`,
                });
              }
            };
            global.checkInRemindTimer = setInterval(sendCheckInRemind, CHECK_IN_CONFIG.REMIND_INTERVAL * 60 * 1000);
            sendCheckInRemind();
          }
          return;
        } else if (res.beginDate && reviseTime(+dayjs()) < +dayjs().hour(10).minute(00)) {
          let title = "打卡状态：今日已签到！";
          if (global.isAutoCheckIn) {
            title = "自动签到结果：签到成功！";
            global.isAutoCheckIn = false;
          }
          await send({
            title,
            content: `
              <h3 style="color:red">今日已签到！</h3><br />
              <p>签到时间：${dayjs(checkInTime).format("YYYY-MM-DD HH:mm:ss")}</p><br />
              <p>当前状态：已签到（<span style="color:red">未签退</span>）</p>`,
          });
          console.log("签到时间", checkInTime, dayjs(checkInTime).format("YYYY-MM-DD HH:mm:ss"));
          console.log("今日已正常签到，关闭脚本！");
          exitScript();
          return;
        }
        if (res.beginDate && res.workingTime < 30600000) {
          if (reviseTime(+dayjs()) < +dayjs().hour(17).minute(00)) return;
          // 未正常签退
          let checkOutRemindTime = +dayjs(checkInTime + 27000000 + (LUNCH_TIME || 1) * 3600000);
          let randomWorkTime = 0;

          randomWorkTime = (Math.random() * -1 + WORING_TIME, +1 + 0.75).toFixed(2);

          let expectCheckOutTime = reviseTime(+dayjs(checkInTime + parseInt(randomWorkTime * 3600000)));

          if (!res.workingTime && reviseTime(+dayjs()) < +dayjs().hour(17).minute(00)) {
            exitScript();
          }
          console.log("签到时间", checkInTime, dayjs(checkInTime).format("YYYY-MM-DD HH:mm:ss"));
          const checkOutRemind = () => {
            // 签到提醒，如果没有签到，在时间段内提醒
            if (CHECK_OUT_CONFIG.ENABLE_REMIND) {
              let title = "签退提醒：可以签退了！";
              let content = `<h3 style="color:red">今日工作时长已满8小时，可以签退了</h3><p>签到时间为${dayjs(
                checkInTime,
              ).format("YYYY-MM-DD HH:mm:ss")}</p>`;
              global.checkOutRemindTimer = setInterval(() => {
                if (res.workingTime > 0) {
                  global.leaveEarly = true;
                  title = "早退提醒：检测到早退！";
                  content = `
                    <h3 style="color:red">检测到早退，请及时处理</h3><br />
                    <p>如未手动处理，将会在19:00脚本自动签退，覆盖早退时间</p>
                    `;
                }
                send({ title, content });
                console.log("开始发送签退提醒！");
              }, CHECK_OUT_CONFIG.REMIND_INTERVAL * 60 * 1000);
              send({ title, content });
              console.log("开始发送签退提醒！");
            }
          };
          if (!global.checkOutRemindJob) {
            console.log("启动签退提醒 Job！");
            global.checkOutRemindJob = schedule.scheduleJob(checkOutRemindTime, checkOutRemind);
          }
          if (reviseTime(+dayjs()) > checkOutRemindTime) {
            console.log("已超过签退提醒时间，直接调用签退提醒函数！");
            global.checkOutRemindJob = null;
            checkOutRemind();
          }
          console.log("签退提醒时间", checkOutRemindTime, dayjs(checkOutRemindTime).format("YYYY-MM-DD HH:mm:ss"));

          // 设置自定义签退时间
          if (CHECK_OUT_CONFIG.LATEST_TIME.enable) {
            console.log("开启自动签退 Job！");
            let { hours, minutes } = CHECK_OUT_CONFIG.LATEST_TIME;
            expectCheckOutTime = +dayjs().hour(hours).minute(minutes);
          }

          // 如果早退，固定七点签退
          if (res.workingTime > 0) {
            expectCheckOutTime = +dayjs().hour(19).minute(0);
          }
          console.log("预计签退时间", expectCheckOutTime, dayjs(expectCheckOutTime).format("YYYY-MM-DD HH:mm:ss"));
          // 启动定时签退任务
          if (!global.checkOutJob) {
            console.log("启动定时签退 Job！");
            global.checkOutJob = schedule.scheduleJob(expectCheckOutTime, clockIn);
          }
          // 容错处理，如果启动脚本时间已经超过打卡时间，直接签退
          if (reviseTime(+dayjs()) > +expectCheckOutTime) {
            console.log("已超过预计签退时间，直接调用签退函数！");
            global.checkOutJob?.cancel();
            clockIn();
          }
        } else if (res.beginDate && res.workingTime > 30600000) {
          let title = "打卡状态：今日已签退";
          if (global.isAutoCheckOut) {
            title = "自动签退结果：签退成功！";
            global.isAutoCheckOut = false;
          }
          send({
            title,
            content: `
            <h3 style="color:red">今日已签退！</h3><br />
            <p>签退时间：${dayjs(checkInTime + res.workingTime).format("YYYY-MM-DD HH:mm:ss")}</p><br />
            <p>当前状态：已签退</p>`,
          });
          console.log("今日已正常签退，关闭脚本！");

          exitScript();
        }
      }
    });
    page.reload();
  } catch (err) {
    console.log("签到过程出错了!");
    send({
      title: "错误提示：脚本执行出错！",
      content: "签到脚本执行错误，请查看 github action",
    });
    throw err;
  }
};
const start = async () => {
  // 10点到17点之间不运行
  if (reviseTime(+dayjs()) > +dayjs().hour(10).minute(00) && reviseTime(+dayjs()) < +dayjs().hour(17).minute(00)) {
    console.log("10点到17点之间不运行脚本");
    return;
  }
  // 调用免费查询是否为工作日的 API
  const res = await axios.get(
    `https://api.apihubs.cn/holiday/get?field=workday&date=${dayjs(reviseTime(+dayjs())).format(
      "YYYYMMDD",
    )}&cn=1&size=1`,
  );
  let list = res?.data?.data?.list || [];
  //  如果为工作日，通过 pushPlus提醒到微信进行二次确认
  if (list[0].workday_cn == "非工作日") {
    send({
      title: "节假日确认打卡",
      content: `<h3 style="color:red">检测到今天为节假日，无需打卡！</h3><a href="https://www.eteams.cn/attend">点击链接手动打卡</a>`,
    });
  } else {
    console.log("今天是工作日，启动打卡脚本！");
    main();
  }
};
start();
