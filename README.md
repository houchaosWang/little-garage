# 小小维修站

给4-5岁孩子的学前学习兴趣引导APP。孩子扮演维修站师傅，帮各种车辆客人修理，数数、颜色、形状等学习内容藏在修车动作里。设计文档见 `docs/`。

## 装到iPad上（一次性）

1. iPad 的 Safari 打开：https://little-garage-2-dplol652md9h.edgeone.dev/ （国内可稳定访问；备用地址 https://houchaoswang.github.io/little-garage/ ）
2. 点分享按钮 → “添加到主屏幕” → 完成。桌面出现“维修站”图标，点开全屏运行，首次加载后无网也能玩。
3. 建议开启 设置 → 辅助功能 → 引导式访问：孩子玩时三击侧边按钮锁定在本APP内，出不去也打不开别的软件。

## 日常

- 每天默认营业4单（约15分钟），修完自动打烊，次日自动开张。
- 想清空进度重来：Safari 网站设置里清除本站数据（家长角落功能上线后可在应用内操作）。

## 更新内容（在电脑上）

1. 让 Claude Code 修改代码；每次内容更新必须把 `sw.js` 里的 `VERSION` 改成新值（如 `garage-v2`），否则 iPad 拿不到新资源。
2. `git push` 后约1分钟生效；iPad 在联网状态下关掉APP重开两次即拿到新版。
3. 发布后自检：电脑浏览器打开线上地址，开发者工具 → Application → Cache Storage 应看到 `garage-v1`（或当前版本号）缓存且169个条目——这一步能发现”某个文件漏提交导致离线缓存整体失效”的问题。

## 开发

- 本地预览：`node tools/serve.mjs` 后打开 http://localhost:8080 （本地 http 不注册 Service Worker，避免缓存干扰调试）
- 跑测试：`node --test tests/*.test.mjs` （注意：本机不要用目录形式 `node --test tests/`）
- 重新生成语音：`python tools/gen-voice.py` （需先 `python -m pip install edge-tts`；本机 pip 不在 PATH 上）
- 重新生成图标：PowerShell 运行 `tools/gen-icons.ps1` （仅Windows，System.Drawing）
- 技术栈：纯 HTML + SVG + vanilla JS（ES Modules），零框架、零依赖、零构建。
- 描字笔画数据与渲染：[hanzi-writer](https://github.com/chanind/hanzi-writer)（MIT License，已离线打包于 vendor/）
