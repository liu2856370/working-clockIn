## 签到脚本
提醒为主，自动签到为辅

**fork 到自己仓库**

 ---

### 功能说明
 - 微信推送提醒（push plus）
   - 支持通过预设时间提醒签到/签退
   - 支持签到/签退成功消息推送
 - 打卡
   - 支持检测节假日
   - 自动检测打卡状态，手动签到/签退后不会再触发自动打卡

 ---

### 脚本配置
通过`config.js`配置，文件内有注释说明

 ---

### 设置帐号密码
![avatar](https://camo.githubusercontent.com/b9dbd1a272825b21076de631df1ab8bf581c9fbbdc4c384d4d07ee2aeb728fd9/687474703a2f2f74752e79616f68756f2e6d652f696d67732f323032302f30362f373438626639633063613631343363642e706e67)

在 Setting-Secrets 添加以下内容：
- `USER_NAME`: 你的 web 端eteams网站帐号
- `PASS_WORD`: 你的 web 端eteams网站密码
- `PUSH_PLUS_TOKEN`: 你的 pushPlus token

说明：
`PUSH_PLUS_TOKEN`获取方式：通过 https://pushplus.hxtrip.com/ 注册获取，需要关注公众号

用户名密码获取方式：登录 https://passport.eteams.cn/ ，进入设置，绑定手机号，并修改密码。  
    
   
