const puppeteer = require("puppeteer");
var axios = require("axios");

// (async () => {
//   const browser = await puppeteer.launch();
//   const page = await browser.newPage();
//   await page.goto("https://www.google.com");
//   // other actions...
//   await browser.close();
// })();
const main = async () => {
  const browser = await puppeteer.launch({
    //启动
    headless: false, // 是否以无头模式运行, 默认ture. 无头就是不打开Chrome图形界面, 更快.
  });
  const page = await browser.newPage(); // 打开一个页面, page就是后序将要操作的
  page.setDefaultNavigationTimeout(120000); // 设置页面的打开超时时间, 因为我要打卡的是学校的垃圾服务器, 超时时间设置了2分钟
  try {
    await page.goto(
      "https://www.eteams.cn/workflows/6561479083450158516/todo",
      { waitUntil: "domcontentloaded" }
    ); //页面跳转, 第二个参数为可选options, 这里表示等待页面结构加载完成, 无需等待img等资源
    console.log("登录页加载成功!"); //控制台输出一下进度
    // 登陆

    await page.evaluate(() => {
      const enterprise = document.querySelector(
        "#loginForm > div.login-other.j_thirdLoginSwitch > div.other-icons > div:nth-child(4) > a"
      ); //用户名input
      enterprise.click();
    });
    await page.waitForNavigation(); //因为要跳转页面, 所以这里等待页面导航
    const code = await page.evaluate(() => {
      const codeSrc = document.querySelector("img.qrcode").src; //用户名input
      console.log(codeSrc);

      return codeSrc;
      //在当前页面执行js代码, 也就是在浏览器环境执行代码, 可以使用所有的浏览器API
    });
    await axios
      .post("http://push.ijingniu.cn/send", {
        key: "8ee9d636dab342938f86bdba0520bae3",
        head: "请用企业微信扫描二维码",
        body: code,
      })
      .then((res) => {
        console.log(res);
      });
    // 查找打卡选项入口在哪, 我的打卡入口登陆后->推荐列表->本科生健康状况申报
    console.log("登陆成功!");
    return;
    const url = await page.evaluate(() => {
      const recommendList = [...document.querySelectorAll(".recommendList li")]; // 获取推荐列表所有的项目
      for (let i = 0; i < recommendList.length; i++) {
        const item = recommendList[i];
        if (
          item.querySelector(".app_name").innerText === "本科生健康状况申报"
        ) {
          // 文字说明在app_name下面
          return item.getAttribute("appurl"); //dom的appurl属性是我下一步要跳转的地址, 将这个地址返回, 这样node环境就能拿到了
        }
      }
    });

    await page.goto(url, { waitUntil: "networkidle0" }); //跳转, 这里表示等待所有网络请求完结, 默认请求不在出现后等待500ms
    console.log("表格加载成功!"); //等待结束后我这里会出现填写健康信息的表格
    // 填报信息, 我这里填写第一次后, 后序打卡默认都填好了, 只需点击承诺, 点击确定
    await page.evaluate(() => {
      // 点击承诺
      [...document.querySelectorAll(".infoplus_checkLabel")].pop().click(); //所有checkbox的最后一个是我要的承诺checkbox
      // 点击确认
      document.querySelector(".command_button_content").click(); //点击确定
    });
    // 这里我点击确定后会有一个请求, 等请求结束后在进行下一步
    const res = await page.waitForResponse(
      (response) =>
        response.url() ===
          "https://baidu.com/infoplus/interface/listNextStepsUsers" &&
        response.status() === 200
    );
    // res.json().then(data => console.log(data)) // 可以把请求内容打出来看看
    // 最后再点一下 好
    await page.evaluate(() => {
      document.querySelector(".dialog_footer button").click();
    });
    await browser.close(); //关闭浏览器结束
  } catch (err) {
    console.log("签到过程出错了!");
    // await browser.close();
    throw err;
  }
};
main();
