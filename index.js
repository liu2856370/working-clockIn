const puppeteer = require("puppeteer");
var axios = require("axios");
var schedule = require("node-schedule");
var send = require("./utils/send.js");
console.log(process.env);
global.checkInTime = null; // 签到时间
global.reloadTimer = null; // 签到前查询
global.remindTimer = null; // 签到前查询
global.checkInJob = null; // 定时签到任务
global.expectCheckOutTime = null; // 预计签退时间

const main = async () => {
  const browser = await puppeteer.launch({
    //启动
    headless: false, // 是否以无头模式运行, 默认ture. 无头就是不打开Chrome图形界面, 更快.
  });
  const page = await browser.newPage(); // 打开一个页面, page就是后序将要操作的
  page.setDefaultNavigationTimeout(120000); // 设置页面的打开超时时间, 因为我要打卡的是学校的垃圾服务器, 超时时间设置了2分钟
  try {
    await page.goto("https://www.eteams.cn/attend", {
      waitUntil: "domcontentloaded",
    }); //页面跳转, 第二个参数为可选options, 这里表示等待页面结构加载完成, 无需等待img等资源
    // 登陆
    await page.evaluate(() => {
      document.querySelector("#username").value = "15557881220"; //用户名input
      document.querySelector("#password").value = "Zr!@#123"; //用户名input
      document.querySelector("#loginForm > div.login-btn > button").click();
    });
    await page.waitForNavigation(); //因为要跳转页面, 所以这里等待页面导航
    await page.waitForSelector(".j_check_inOrOut");

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
      await browser.close(); //关闭浏览器结束
      setTimeout(() => {
        process.exit();
      }, 10000);
    };
    reloadTimer = setInterval(() => {
      page.reload();
    }, 120000);
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
            "X-Forwarded-For": "223.70.159.3",
          },
        });
        return;
      }

      // Don't override other requests
      request.continue();
    });

    page.on("response", (response) => {
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
            global.checkInTime = +new Date();
            global.expectCheckOutTime = new Date(
              global.checkInTime +
                parseInt((Math.random() * -1 + 9.5) * 3600000)
            );
            schedule.scheduleJob(global.expectCheckOutTime, main);
          }
          if (res.checkMap.message.includes("签退成功")) {
            send({
              title: "签退成功",
              content: `<h3 style="color:red">当前状态：已签退</h3>`,
            });
          }
        });
      }
      if (
        response._url ==
        "https://www.eteams.cn/attendapp/timecard/queryAttendStatus.json"
      ) {
        response.json().then((res) => {
          console.log(res);
          // 如果没有签到，每30秒发送一次提醒
          if (!res.beginDate) {
            if (!global.checkInJob) {
              global.checkInJob = schedule.scheduleJob(
                "03 48 9 * * *",
                clockIn
              );
            }
            global.remindTimer = setInterval(() => {
              send({
                title: "签到提醒！！！",
                content: `<h3 style="color:red">临近签到结束时间，请及时签到！</h3><a href="https://www.eteams.cn/attend">点击链接签到</a>`,
              });
            }, 30000);
          } else {
            send({
              title: "签到提醒！！！",
              content: `<h3 style="color:red">已签到</h3><p>签到时间为${new Date(
                res.beginDate
              )}</p>`,
            });

            global.checkInTime = res.beginDate;
            global.expectCheckOutTime = new Date(
              global.checkInTime +
                parseInt((Math.random() * -1 + 9.5) * 3600000)
            );
            clearInterval(global.remindTimer);
            global.remindTimer = null;
            clearInterval(global.reloadTimer);
            global.reloadTimer = null;
            global.checkInJob = null;
            schedule.scheduleJob(global.expectCheckOutTime, main);
            // 距离预订的打卡时间
            let timeDifference =
              (+global.expectCheckOutTime - +new Date()) / 3600000;
            // 距离签退时间大于一小时关闭脚本
            if (timeDifference > 1) {
              setTimeout(() => {
                process.exit();
              }, 10000);
            }
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
const init = async () => {
  // 调用免费查询是否为工作日的 API
  const todayInfo = await axios.get("http://timor.tech/api/holiday/info");
  //  如果为工作日，通过 pushPlus提醒到微信进行二次确认
  if (todayInfo.data.holiday) {
    await send({
      title: "节假日确认打卡",
      content: `<h3 style="color:red">检测到今天为节假日，无需打卡！</h3><a href="https://www.eteams.cn/attend">点击链接手动打卡</a>`,
    });
  } else {
    // 工作日自动打卡
    // 每天9:48分自动打卡
    schedule.scheduleJob("03 30 9 * * *", main);
    // main();
  }
};
init();
