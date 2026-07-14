# netdisk-to-vrchat-Direct-link

把网盘分享链接解析成临时下载地址，并给 VRChat / AVPro 提供一个带 `.mp4` 后缀、支持 `HEAD` 和跨域请求的固定入口。

在线Demo：[api.dtpoi.cn](https://api.dtpoi.cn)

## 支持的平台

| 平台 | 分享域名 | 提取码 | 普通直链 | VRChat 入口 |
| --- | --- | --- | --- | --- |
| QQ闪传 | `qfile.qq.com` | 不需要 | 302 跳转 | 支持 |
| iCloud Drive | `icloud.com` / `icloud.com.cn` | 不需要 | 302 跳转 | 支持 |
| 文叔叔 | `wss.ink` 等 | 支持 | 302 跳转 | 支持 |
| 飞书云盘 | `*.feishu.cn` | 目前不支持 | Edge Function 实时转发 | 支持 |
| OneDrive | `1drv.ms` / `onedrive.live.com` | 不需要 | 302 跳转 | 支持 |
| 小飞机网盘 | `share.feijipan.com` / `www.feijix.com` | 支持 | 302 跳转 | 支持 |

文件夹分享会取根目录中第一个可下载文件。
平台接口和风控随时可能调整，若遇到解析失败问题可以提交Issues。

问题反馈/联系：[dtpoi@foxmail.com](mailto:dtpoi@foxmail.com)

## 地址格式

普通解析：

```text
https://api.dtpoi.cn/do?url=分享链接&pwd=可选提取码
```

返回 JSON，不跳转：

```text
https://api.dtpoi.cn/do?url=分享链接&pwd=可选提取码&format=json
```

QQ闪传的 VRChat 地址使用短路径：

```text
https://api.dtpoi.cn/vrchat/qq/QQ分享码.mp4
```

其余平台使用通用入口：

```text
https://api.dtpoi.cn/vrchat/media.mp4?url=分享链接&pwd=可选提取码
```

网页输入框和 `/do` 的 `url` 参数都能从一段分享文案中提取第一个 HTTPS 链接，例如：

```text
某某通过QQ闪传分享了【video.mp4】
链接：https://qfile.qq.com/q/xxxxxxxxxx
```

## 为什么要有 VRChat 路由？

很多网盘直链需要先经过一次 302 跳转。浏览器通常能正常处理，但 VRChat 中的 AVPro 播放器还会发起 `HEAD`、`Range` 和跨域请求，仅使用 `/do?url=...` 时并不稳定。

`/vrchat/qq/*.mp4` 和 `/vrchat/media.mp4` 做了几件事：

- 路径保留 `.mp4` 后缀；
- 接受 `GET`、`HEAD` 和 `OPTIONS`；
- 返回播放器需要的 CORS 响应头；
- 每次请求重新解析临时地址，避免保存已经过期的直链；
- 飞书下载由边缘函数转发，并保留 `Range`、`Content-Range` 等媒体响应头。

## 项目结构

```text
.
├── assets/                     # 页面样式、交互和阿里健康体
├── edge-functions/
│   ├── do.js                   # 六个平台的识别、解析与普通下载路由
│   └── vrchat/
│       ├── media.mp4.js        # 六平台通用 VRChat 路由
│       └── qq/[file].js        # QQ闪传短路径
├── tests/                      # Node.js 单元测试
├── index.html
└── robots.txt
```

这是纯 EdgeOne Pages + Edge Functions 项目，
不需要数据库、KV、对象存储或环境变量。

网页使用 **阿里健康体 2.0** 作为主要中文字体。
- **来源**：通过阿里健康 / [方正字库](https://www.alihealth.cn/downloadfont)客户端下载。
- **许可**：永久免费商用（个人与商业用途均可），详情见官方授权说明。
- **使用方式**：字体文件转换为 WOFF2 格式并自托管，仅用于本网站网页显示，未进行任何修改或衍生。
- **官方链接**： [方正字库 - 阿里健康体](https://www.foundertype.com/index.php/FontInfo/index/id/6694)
  
## 本地运行

需要 Node.js 20 或更新版本。

```sh
npm install
npm test
python3 -m http.server 4173
```

本地静态服务器只能预览页面。Edge Functions 要在 EdgeOne 环境中运行。

## 部署到 EdgeOne Pages

安装并登录 EdgeOne CLI 后，在项目根目录执行：

```sh
npx -y edgeone makers deploy -n 你的项目名
```

CLI 会上传静态文件并编译 `edge-functions/`。部署完成后，将自定义域名绑定到 Pages 项目即可。

## 数据与使用范围

服务不持久化分享链接、提取码或文件，也不代理多数平台的文件本体。
飞书云盘是例外：匿名下载依赖会话 Cookie，因此文件内容会经过 Edge Function 实时转发，但不会落盘。

请只解析自己有权访问和下载的分享内容。
临时直链可能过期，也可能受到分享平台的地区、频率或账号限制。OneDrive 在国内的访问速度不稳定；小飞机网盘可能限制游客下载大文件，也可能拦截部分云服务商 IP。

另外默认的`robots.txt`、页面 meta 和函数响应头均设置为禁止搜索引擎与 AI 抓取。

## 参考

- 解析思路和平台接口参考：[qaiu/netdisk-fast-download](https://github.com/qaiu/netdisk-fast-download)
- 配色与三角形背景参考：[超时空辉夜姬动画官网](https://www.cho-kaguyahime.com/)
- 代码辅助：GPT-5.6 Sol

本项目没有打包上述网站的图片或脚本。
背景三角形纹理由项目内的 CSS 绘制。

## 许可证

[MIT](./LICENSE)

## 免责声明

用户在使用本项目时，应自行承担风险，并确保其行为符合当地法律法规。开发者不对用户因使用本项目而导致的任何后果负责。
