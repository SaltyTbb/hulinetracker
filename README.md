# hulinetracker

云南 → 东北 骑行地图。响应式 Web App，部署在 GitHub Pages。

地图展示已骑 GPX 轨迹 + 腾冲↔黑河起终点虚线，侧边 Tracker 面板显示：

- 已骑天数
- 日均里程
- 日均爬升
- 距离进度（目标 5700 km）
- 爬升进度（目标 45000 m）

主题：黑 / 灰 / 黄。底图：CARTO Dark Matter。

---

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run preview
```

构建命令会先运行 `scripts/build-manifest.mjs`，扫描 `public/gpx/*.gpx` 生成
`public/gpx/index.json`（已在 `.gitignore` 中，不会提交）。

## 管理 GPX

持久化：把 `.gpx` 文件放进 `public/gpx/` 然后 commit + push。下次部署会自动
包含这些轨迹。删除同理。

本地预览：在页面上展开"本地预览 GPX"面板，输入口令 `tbbnb` 解锁，拖拽
`.gpx` 文件到区域内即可看到效果。这些文件只存在于当前浏览器会话中，不会
上传到服务器也不会分享给其他人。口令只是弱防误触，不是安全防护。

## 部署到 GitHub Pages

1. 仓库名应为 `hulinetracker`（否则请同步修改 `vite.config.ts` 里的
   `base`）。
2. Settings → Pages → Source 选 **GitHub Actions**。
3. push 到 `main` 即会触发 `.github/workflows/deploy.yml` 自动构建并发布。

## 起终点坐标

- 腾冲 `[98.4937, 25.0203]`
- 黑河 `[127.4997, 50.2497]`

修改参数（如里程目标）在 [src/lib/constants.ts](src/lib/constants.ts)。
