# Sign-up flow · 可交互网页源码

一个完整可交互的「登录 / 注册」流程页面，纯 HTML + CSS + JavaScript，**无框架、无构建、无依赖**。
直接双击 `index.html` 即可在浏览器打开，也可以原样部署到任何静态托管（GitHub Pages、Vercel、Netlify、OSS…）。

> 授权：代码为 [CC BY-NC-SA 4.0](LICENSE)（署名 · 非商业性使用 · 相同方式共享），角色图片另有[单独条款](assets/img/LICENSE.md)。详见文末「授权」。

## 流程

| 步骤 | 交互 |
|---|---|
| 01 Sign in | 邮箱 / 密码登录；密码以柠檬片显示，眼睛按钮可切换明文；校验失败时字段抖动 + 提示 |
| 02 Create account | 底部圆弧卡片弹性升起、标题乱码重排；姓名 / 邮箱 / 密码，五色强度条（Sour → Squeezed!） |
| 03 Pick an avatar | 头像条可**拖动、甩动、点击、方向键**选择，带惯性和弹簧回弹；页面主题色跟随中间的头像；「This is me」后头像探出卡片 |
| 04 Verify | 6 位验证码：自动跳格、退格回退、整段粘贴、自动提交；柠檬片转圈 → 对勾 → 波浪跳动；重发倒计时 |
| 05 Make it yours | 点色块换主题色，颜色从被点击的色块处圆形扩散；支持方向键 |
| 06 Profile | 卡片翻转成个人主页：头像破框、名字解码、贴纸依次落下；可返回改主题或退出登录 |

其他：
- **一步步回退**：每一步卡片左上角都有返回按钮，浏览器后退键、手机返回手势也同样逐步回退（每一步都是一条浏览器历史记录）。
  - 回退顺序：资料卡 → 主题色 → 验证码 → 挑头像 → 注册 → 登录，前进键可以再走回去。
  - 回退后已填写的内容都会保留；验证码已经通过的，回到那一步显示「Continue」，不需要重新验证。
  - 退出登录后，后退不会回到已登录的步骤。
- 首次打开时每拍换一个角色作为开场；之后再访问会记住你的头像、主题色和邮箱。
- 右上角 **Cast 1 / Cast 2** 一键切换两组角色。
- 适配桌面与手机：卡片按视口等比缩放，窄屏隐藏两侧装饰栏。
- 支持键盘操作、屏幕阅读器标签，以及系统「减少动态效果」设置（会关闭动画）。

## 文件结构

```
index.html            页面结构（各步骤的表单都在这里）
css/style.css         全部样式；卡片以 660×764 设计尺寸绘制，再用 --k 缩放
js/cast.js            角色数据（名字、主题色、脸部坐标）+ 首字母字形轮廓
js/app.js             交互逻辑：屏幕切换、弹簧动画、拖动、验证码、主题、个人卡片
assets/img/cast1|2/   角色抠图（WebP，透明背景，720×960），单独授权见 assets/img/LICENSE.md
assets/fonts/         字体文件 + 各自的 OFL 授权原文
LICENSE               代码授权：CC BY-NC-SA 4.0
```

## 接入真实后端

所有与服务器有关的逻辑都集中在 `js/app.js` 顶部的 `api` 对象里，目前是用 `localStorage` 模拟的演示实现：

```js
const api = {
  async signUp({ name, email, password }) { ... },   // 注册
  async signIn(email, password) { ... },             // 登录，失败返回 null
  async sendCode(email) { ... },                     // 发送验证码
  async verifyCode(email, code) { ... },             // 校验验证码（演示：任意 6 位数字都通过）
  async saveProfile(patch) { ... },                  // 保存头像 / 主题等资料
};
```

把这几个函数替换成你自己的接口请求即可，界面代码不需要改。
⚠️ 演示版把账号存在浏览器本地，仅用于展示；正式环境请勿在前端保存密码。

## 自定义

- **换角色 / 配色**：编辑 `js/cast.js`。每个角色需要：
  - `c`：主题色
  - `ink`：主题色上的文字颜色
  - `name`：名字
  - `face`：脸部中心坐标，按 1086×1448 原图计算
  - `ldx`：首字母相对脸的水平偏移

  另有两个顺序列表：`hook` 是开场轮换顺序，`pick` 是头像条和色块的顺序。
- **换文案**：标题和副标题在 `app.js` 的 `SCREENS`，按钮和表单文字在 `index.html`。
- **动画手感**：弹簧参数在 `app.js` 的 `tick()` 里：
  - 卡片升降：刚度 170、阻尼 15
  - 头像条：刚度 220、阻尼 18

## 浏览器支持

Chrome / Edge 104+、Safari 15.4+、Firefox 105+（用到了 Web Animations、CSS `translate/scale` 独立属性、`clip-path` 动画、Pointer Events）。

## 授权

**代码**（`index.html`、`css/`、`js/`）采用 [CC BY-NC-SA 4.0](LICENSE)（知识共享 署名-非商业性使用-相同方式共享 4.0 国际）：

- **署名**：使用或改编时，请注明原作者 cody999110 并附上本仓库链接；
- **非商业性使用**：不得用于商业目的，包括但不限于商业产品或网站、外包 / 接单项目、付费课程、付费模板或素材；
- **相同方式共享**：改编后的作品须以同样的 CC BY-NC-SA 4.0 协议公开。

需要商业授权的，请通过本仓库的 Issues 联系作者。

**角色图片**（`assets/img/`）不在上述 CC 协议范围内，单独授权：只能在运行、展示本项目时原样使用，不得单独提取、商用、用作头像或训练 AI 等，详见 [assets/img/LICENSE.md](assets/img/LICENSE.md)。图片由 AI（gpt-image-2）生成，描绘的是虚构人物，不对应任何真实个人。

**字体**均为 SIL Open Font License 1.1，可随项目分发，授权原文在 `assets/fonts/`：

- [Bodoni Moda](https://github.com/indestructible-type/Bodoni) — `OFL-BodoniModa.txt`
- [Space Mono](https://github.com/googlefonts/spacemono) — `OFL-SpaceMono.txt`
- [Geist](https://github.com/vercel/geist-font) — `OFL-Geist.txt`

---

**English:** Code is licensed under [CC BY-NC-SA 4.0](LICENSE): credit the author (cody999110) with a link to this repository, no commercial use, and share adaptations under the same license. The character images in `assets/img/` are licensed separately and more restrictively — see [assets/img/LICENSE.md](assets/img/LICENSE.md). The fonts are under the SIL OFL 1.1.
