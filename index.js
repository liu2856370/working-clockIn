const puppeteer = require("puppeteer");
var axios = require("axios");
var schedule = require("node-schedule");
var send = require("./utils/send.js");
require("./utils/format");
const {
  CHECK_IN_CONFIG,
  CHECK_OUT_CONFIG,
  WORING_TIME,
  CLOCK_IN_IP,
} = require("./config.js");
const USER_NAME = process.env.USER_NAME;
const PASS_WORD = process.env.PASS_WORD;
// const USER_NAME = "15557881220";
// const PASS_WORD = "Zr!@#123";

const LUNCH_TIME = 1; // 午休时间，默认1小时，无需修改
const main = async () => {
  const browser = await puppeteer.launch({
    //启动
    headless: true, // 是否以无头模式运行, 默认ture. 无头就是不打开Chrome图形界面, 更快.
  });
  const page = await browser.newPage(); // 打开一个页面, page就是后序将要操作的
  page.setDefaultNavigationTimeout(120000); // 设置页面的打开超时时间, 因为我要打卡的是学校的垃圾服务器, 超时时间设置了2分钟
  try {
    await page.goto("https://www.eteams.cn/attend", {
      waitUntil: "domcontentloaded",
    }); //页面跳转, 第二个参数为可选options, 这里表示等待页面结构加载完成, 无需等待img等资源
    // 登陆
    await page.evaluate(
      ({ USER_NAME, PASS_WORD }) => {
        document.querySelector("#username").value = USER_NAME; //用户名input
        (document.querySelector("#password").value = PASS_WORD), //用户名input
          document.querySelector("#loginForm > div.login-btn > button").click();
      },
      { USER_NAME, PASS_WORD }
    );
    await page.waitForNavigation(); //因为要跳转页面, 所以这里等待页面导航
    await page.waitForSelector(".j_check_inOrOut");
    console.log("已进入签到页面！！！");
    const clockIn = async () => {
      await page.evaluate(async () => {
        console.log("进入打卡函数");
        const today = moment().format("YYYY-MM-DD");
        // 未签到
        if ($(".j_check_inOrOut")[0].innerText == "签到") {
          $(".j_check_inOrOut").click();
        } else if (
          document.querySelector(
            `.j_miss-tab div.content-info[attendday='${today}']`
          )
        ) {
          // 未签退
          // console.log("签退");
          $(".j_check_inOrOut").click();
        }
      });
    };
    if (!global.reloadTimer) {
      global.reloadTimer = setInterval(() => {
        page.reload();
      }, 120000);
    }
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      let isTargetUrl = request._url.startsWith(
        "https://www.eteams.cn/attendapp/timecard/check.json"
      );
      // let isTargetUrl = request._url.startsWith(
      //   "https://www.eteams.cn/attendapp/timecard/queryAttendStatus.json"
      // );
      if (isTargetUrl) {
        request.continue({
          headers: {
            ...request._headers,
            "X-Forwarded-For": "223.70.159.3" || CLOCK_IN_IP,
          },
        });
        return;
      }

      // Don't override other requests
      request.continue();
    });

    page.on("response", (response) => {
      let time = new Date();

      if (
        response._url.includes(
          "https://www.eteams.cn/attendapp/timecard/check.json"
        )
      ) {
        response.json().then((res) => {
          if (res.checkMap.message.includes("签到成功")) {
            send({
              title: "签到成功",
              content: `<h3 style="color:red">当前状态：未签退</h3>`,
            });
            clearInterval(global.checkInRemindTimer);
            global.checkInRemindTimer = null;
            clearInterval(global.reloadTimer);
            global.reloadTimer = null;
          }
          if (res.checkMap.message.includes("签退成功")) {
            send({
              title: "签退成功",
              content: `<h3 style="color:red">当前状态：已签退</h3>`,
            });
            setTimeout(async () => {
              await browser.close(); //关闭浏览器结束
              global.checkOutJob = null;
              global.checkInJob = null;
              global.checkOutRemindJob = null;
              clearInterval(global.checkOutRemindTimer);
              global.checkOutRemindTimer = null;
            }, 30000);
          }
        });
      }
      if (
        response._url ==
        "https://www.eteams.cn/attendapp/timecard/queryAttendStatus.json"
      ) {
        response.json().then((res) => {
          // 如果没有签到，每30秒发送一次提醒
          if (!res.beginDate) {
            // 启动定时任务
            if (!global.checkInJob) {
              global.checkInJob = schedule.scheduleJob(
                `00 ${CHECK_IN_CONFIG.LATEST_TIME || 48} 9 * * *`,
                clockIn
              );
            }
            // 容错处理，如果启动时间已经超过了最后打卡时间，直接执行
            if (time.getHours() >= 9 && time.getMinutes() >= 50) {
              clockIn();
            }
            // 签到提醒，如果没有签到，在时间段内提醒
            if (!global.checkInRemindTimer && CHECK_IN_CONFIG.ENABLE_REMIND) {
              global.checkInRemindTimer = setInterval(() => {
                if (time.getHours() != 9) return;
                if (
                  time.getMinutes() >=
                    (CHECK_IN_CONFIG.START_REMIND_TIME || 30) &&
                  time.getMinutes() <= (CHECK_IN_CONFIG.LATEST_TIME || 48)
                ) {
                  send({
                    title: "签到提醒！！！",
                    content: `<h3 style="color:red">工作日请及时签到！</h3>`,
                  });
                }
              }, (CHECK_IN_CONFIG.REMIND_INTERVAL || 300) * 60 * 1000);
            }
          } else {
            let year = time.getFullYear();
            let month = time.getMonth();
            let day = time.getDate();
            let checkInTime =
              res.beginDate || +new Date(year, month, day, 9, 55, 00);
            let checkOutRemindTime = new Date(
              checkInTime + 27000000 + (LUNCH_TIME || 1) * 3600000
            );

            console.log(
              "签到时间",
              checkInTime,
              new Date(checkInTime).format("hh:mm:ss")
            );
            const checkOutRemind = () => {
              // 签到提醒，如果没有签到，在时间段内提醒
              if (
                !global.checkOutRemindTimer &&
                CHECK_OUT_CONFIG.ENABLE_REMIND
              ) {
                global.checkOutRemindTimer = setInterval(() => {
                  send({
                    title: "签退提醒！！！",
                    content: `<h3 style="color:red">今日工作时长已满8小时，可以签退了</h3><p>签到时间为${checkInTime}</p>`,
                  });
                }, (CHECK_OUT_CONFIG.REMIND_INTERVAL || 300) * 60 * 1000);
              }
            };
            if (!global.checkOutRemindJob) {
              global.checkOutRemindJob = schedule.scheduleJob(
                checkOutRemindTime,
                checkOutRemind
              );
            }
            if (+new Date() > +checkOutRemindTime) {
              checkOutRemind();
            }
            console.log(
              "签退提醒时间",
              +checkOutRemindTime,
              new Date(+checkOutRemindTime).format("hh:mm:ss")
            );

            let randomWorkTime = 0;
            while (randomWorkTime < 8.5) {
              randomWorkTime = (Math.random() * -1 + 7.5 + 1 + 0.75).toFixed(2);
            }
            let expectCheckOutTime = new Date(
              checkInTime + parseInt(randomWorkTime * 3600000)
            );
            if (CHECK_OUT_CONFIG.LATEST_TIME.enable) {
              let { hours, minutes } = CHECK_OUT_CONFIG.LATEST_TIME;
              expectCheckOutTime = new Date(
                year,
                month,
                day,
                hours,
                minutes,
                0
              );
            }
            console.log(
              "预计签退时间",
              +expectCheckOutTime,
              new Date(+expectCheckOutTime).format("hh:mm:ss")
            );
            // 启动定时签退任务
            if (!global.checkOutJob) {
              global.checkOutJob = schedule.scheduleJob(
                expectCheckOutTime,
                clockIn
              );
            }
            // 容错处理，如果启动脚本时间已经超过打卡时间，直接签退
            if (+new Date() > +expectCheckOutTime) {
              clockIn();
            }
            clearInterval(global.checkInRemindTimer);
            global.checkInRemindTimer = null;
            clearInterval(global.reloadTimer);
            global.reloadTimer = null;
          }
        });
      }
      return response;
    });
    page.reload();
  } catch (err) {
    console.log("签到过程出错了!");
    // await browser.close();
    throw err;
  }
};
const start = async () => {
  // 调用免费查询是否为工作日的 API
  const todayInfo = await axios.get("http://timor.tech/api/holiday/info");
  //  如果为工作日，通过 pushPlus提醒到微信进行二次确认
  if (todayInfo.data.holiday) {
    await send({
      title: "节假日确认打卡",
      content: `<h3 style="color:red">检测到今天为节假日，无需打卡！</h3><a href="https://www.eteams.cn/attend">点击链接手动打卡</a>`,
    });
  } else {
    main();
  }
};
start();
