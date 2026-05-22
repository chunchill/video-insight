# Video Insight Extension

Video Insight 是一个个人使用的浏览器插件，用来快速理解 YouTube 视频的关键内容和观点。

打开 YouTube 视频后，插件会读取页面中已经可用的字幕或转录文本，然后调用你配置的 OpenAI-compatible 模型供应商，生成结构化洞察。输出支持中文和英文切换。

## 功能

- 在 YouTube watch 页面右侧推荐栏附近直接显示 Video Insight 面板。
- 点击页面面板里的 `Generate insight` 生成当前视频洞察。
- 面板会尽量自动打开 YouTube 的 transcript / 转写文稿 UI，并读取当前视频的可见字幕/转录文本。
- 切换到另一个视频时，会自动清空旧视频的洞察结果。
- 浏览器扩展侧边栏仍可作为备用入口。
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

- 插件只读取 YouTube 页面已经存在或能够打开的字幕/转录文本。
- 如果 YouTube 没有提供 `transcript` / `转写文稿` / `Show transcript`，文本洞察暂不支持，页面面板会显示提示或错误。
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
video-insight-extension-v0.2.0.zip
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
2. 在 YouTube 右侧推荐栏附近找到 `Video Insight` 页面面板。
3. 选择输出语言：
   - `Chinese (Simplified)`
   - `English`
4. 点击页面面板里的 `Generate insight`。
5. 等待面板自动打开 YouTube 的转写文稿并返回洞察结果。

通常不需要先手动打开转写文稿。只有当页面面板提示 YouTube 没有自动加载 transcript 时，再手动打开：

- 中文 YouTube 页面：展开视频简介区域的 `更多`，找到 `转写文稿`，点击 `内容转文字`。
- 英文 YouTube 页面：展开视频简介区域的 `More`，找到 `Transcript`，点击 `Show transcript`。

手动打开后，再回到 `Video Insight` 页面面板点击 `Generate insight`。

如果 YouTube 不提供 `transcript`、`转写文稿` 或 `Show transcript`，插件无法生成文本洞察，面板会显示提示或错误。插件不会下载音频或做自动语音转写。

如果页面内联面板没有出现，仍可以点击浏览器 Extension 工具栏里的 `Video Insight` 扩展图标，打开浏览器扩展侧边栏作为备用入口。

切换到另一个 YouTube 视频时，页面面板会自动清空上一个视频的洞察结果。

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

插件只读取 YouTube 页面中已经可用或能够自动打开的字幕/转录文本。如果视频没有字幕，或者 YouTube 没有暴露 `transcript` / `转写文稿` / `Show transcript`，插件无法生成文本洞察。

如果页面面板提示 transcript 没有自动加载，可以手动打开转写文稿后重试：中文页面展开 `更多`，找到 `转写文稿` 并点击 `内容转文字`；英文页面展开 `More`，找到 `Transcript` 并点击 `Show transcript`。

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
