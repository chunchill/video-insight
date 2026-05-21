# Video Insight Extension

Video Insight 是一个个人使用的浏览器插件，用来快速理解 YouTube 视频的关键内容和观点。

打开 YouTube 视频后，插件会读取页面中已经可用的字幕或转录文本，然后调用你配置的 OpenAI-compatible 模型供应商，生成结构化洞察。输出支持中文和英文切换。

## 功能

- 在 YouTube 页面右侧打开侧边栏。
- 读取当前视频的可见字幕/转录文本。
- 配置自定义 AI 供应商、Base URL、API Key 和模型名。
- 支持 OpenAI-compatible 接口，例如 OpenAI、硅基流动等兼容服务。
- 支持中文和英文两种洞察输出语言。
- 输出结构化结果：
  - Summary
  - Key takeaways
  - Viewpoints
  - Evidence / timestamps
  - Caveats
- API Key 存储在浏览器扩展本地存储中，适合个人本地使用。

## 当前限制

- 第一版只读取 YouTube 页面已经存在的字幕/转录文本。
- 暂不支持下载音频或自动语音转写。
- 暂不提供云端账号、同步、历史记录或团队协作功能。
- Provider Base URL 仅接受 HTTPS，避免 API Key 和字幕内容通过明文 HTTP 传输。

## 技术栈

- TypeScript
- React
- Vite
- Chrome Extension Manifest V3
- Vitest
- React Testing Library

## 从 0 到 1 安装插件

推荐普通用户使用 GitHub Release 里的打包版本；开发者再使用源码构建方式。

### 方式 A：从 GitHub Release 下载并安装

1. 打开项目 Release 页面：

```text
https://github.com/chunchill/video-insight/releases
```

2. 下载最新版本里的插件压缩包，例如：

```text
video-insight-extension-v0.1.0.zip
```

3. 解压这个 zip 文件。

解压后会得到一个 `dist/` 目录。后续浏览器加载插件时，请选择这个解压出来的 `dist/` 目录。

4. 在 Chrome 地址栏输入：

```text
chrome://extensions/
```

5. 打开右上角的 `Developer mode`。
6. 点击 `Load unpacked`。
7. 选择刚刚解压出来的 `dist/` 目录。
8. 加载成功后，扩展列表里会出现 `Video Insight`。

Edge 用户同理，只是扩展管理页面地址是：

```text
edge://extensions/
```

### 方式 B：从源码构建并安装

#### 1. 准备环境

需要先安装 Node.js 和 npm。

建议使用 Node.js 20 或更新版本。

检查本机环境：

```bash
node -v
npm -v
```

#### 2. 安装项目依赖

进入项目目录：

```bash
cd /Users/jasper.qiu/Projects/ai-labs/video-insight
```

安装依赖：

```bash
npm install
```

#### 3. 构建浏览器插件

运行：

```bash
npm run build
```

构建成功后，会生成 `dist/` 目录。这个目录就是要加载到浏览器里的插件目录。

#### 4. 在 Chrome 中加载插件

1. 打开 Chrome。
2. 地址栏输入：

```text
chrome://extensions/
```

3. 打开右上角的 `Developer mode`。
4. 点击 `Load unpacked`。
5. 选择项目下的 `dist` 目录：

```text
/Users/jasper.qiu/Projects/ai-labs/video-insight/dist
```

6. 加载成功后，扩展列表里会出现 `Video Insight`。

#### 5. 在 Edge 中加载插件

1. 打开 Edge。
2. 地址栏输入：

```text
edge://extensions/
```

3. 打开 `Developer mode`。
4. 点击 `Load unpacked`。
5. 选择：

```text
/Users/jasper.qiu/Projects/ai-labs/video-insight/dist
```

## 配置 AI 供应商

加载插件后，需要先配置模型供应商。

1. 在浏览器扩展列表中找到 `Video Insight`。
2. 打开插件的 `Details`。
3. 点击 `Extension options`。
4. 填写：
   - `Provider name`：例如 `SiliconFlow` 或 `OpenAI`
   - `Base URL`：例如 `https://api.siliconflow.cn/v1`
   - `API key`：你的供应商 API Key
   - `Model`：模型名，例如 `Qwen/Qwen2.5-72B-Instruct` 或 `gpt-4.1-mini`
   - `Default output language`：默认输出语言
5. 点击 `Save provider`。

注意：API Key 会保存在浏览器扩展本地存储中。这个项目第一版面向个人本地使用，不建议作为公开 SaaS 产品直接分发。

## 使用插件

1. 打开一个 YouTube 视频页面。
2. 确认该视频有可用字幕/转录文本。更稳妥的做法是先在 YouTube 视频下方找到并点击 `转写文稿`，让 YouTube 把视频内容转成文字并显示在页面上；如果页面没有直接显示这个入口，可以先点击视频简介区域的 `更多`，再查找 `转写文稿`。
3. 转写文稿显示出来后，再点击浏览器 Extension 工具栏里的 `Video Insight` 扩展图标，打开侧边栏。
4. 选择输出语言：
   - `Chinese (Simplified)`
   - `English`
5. 点击 `Generate insight`。
6. 等待模型返回洞察结果。

如果当前视频没有检测到字幕，插件会显示无字幕提示。第一版不会尝试下载音频或做语音转写。

## 开发命令

运行测试：

```bash
npm test
```

监听构建：

```bash
npm run dev
```

生产构建：

```bash
npm run build
```

## 开发时重新加载插件

修改代码后：

1. 重新运行：

```bash
npm run build
```

2. 打开 `chrome://extensions/`。
3. 找到 `Video Insight`。
4. 点击刷新按钮重新加载扩展。
5. 回到 YouTube 页面刷新网页。

## 目录结构

```text
public/manifest.json          Manifest V3 插件配置
src/background/               扩展后台脚本
src/content/                  YouTube 页面内容脚本和字幕提取
src/options/                  供应商配置页面
src/providers/                OpenAI-compatible provider adapter
src/shared/                   共享类型、prompt、结果解析
src/sidepanel/                侧边栏主界面
src/storage/                  浏览器本地存储封装
tests/                        单元测试和组件测试
dist/                         构建后的插件目录
```

## 常见问题

### 为什么点击生成后提示没有字幕？

第一版只读取 YouTube 页面中已经可用的字幕/转录文本。如果视频没有字幕，或者页面没有加载出 transcript segments，插件无法生成洞察。

### 可以使用硅基流动吗？

可以，只要该供应商提供 OpenAI-compatible chat completions 接口。配置时把 `Base URL`、`API Key` 和 `Model` 填成对应供应商的值。

### 为什么 Base URL 必须是 HTTPS？

插件会把 API Key 和视频字幕发送给你选择的模型供应商。HTTPS 可以避免这些内容通过明文 HTTP 传输。

### API Key 会上传到项目服务器吗？

不会。第一版没有后端服务，API Key 存在浏览器扩展本地存储中，调用模型时由插件直接请求你配置的供应商。

## 验证状态

当前实现已通过：

```bash
npm test
npm run build
```
