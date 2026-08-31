# 榆野博物馆

榆野博物馆是一个使用 Vue 3 + Vite 构建的粉丝自发线上展示馆。V1.5 整理了正式文字与视觉层级，并完成小草坪、留言、意见、回复和版权反馈的纯前端交互原型；项目不包含未经核实的真实粉圈历史。

完整范围见 [Inputs/需求文档-v1.5.md](Inputs/需求文档-v1.5.md)，手工添加真实内容时请使用 [Inputs/内容录入指南-v1.5.md](Inputs/内容录入指南-v1.5.md)。此前版本仍保留在 `Inputs/` 中。

## 本地运行

需要 Node.js 22 或兼容版本。

```bash
npm install
npm run dev
```

浏览器打开终端显示的本地地址。生产构建：

```bash
npm run build
npm run preview
```

## 页面

- `/#/`：首页和馆藏搜索
- `/#/keyword/馆藏-id`：馆藏横向时间轴
- `/#/lawn`：小草坪
- `/#/about`：建馆说明

项目使用 Hash 路由，确保 GitHub Pages 上直接打开和刷新页面时不会因服务器缺少路由回退而出现 404。

## 更新馆藏内容

关键词和时间轴位于 `src/data/keywords.json`，公开小草位于 `src/data/community.json`，馆主的话位于 `src/data/curator-notes.json`。三个文件默认允许为空；录入真实内容前请阅读内容录入指南。

每次构建会先运行零依赖内容检查。也可以单独运行：

```bash
npm run validate:content
```

图片和本地音频放入 `public/`；视频只填写外部平台链接，不下载、不内嵌。不要把 GitHub 写入令牌、管理员凭据或其他秘密放进前端代码。

## GitHub 仓库

项目已连接到 [GrayChan04/YuyeMuseum](https://github.com/GrayChan04/YuyeMuseum)。后续改动合并到 `main` 后，由 GitHub Actions 自动构建并部署。

认证时不要把 GitHub 密码发给任何人。GitHub 的 Git 操作应使用浏览器凭据管理器、SSH 密钥或个人访问令牌；敏感凭据只在系统认证提示中由你本人输入，不写进命令、聊天、文件或仓库。

## 启用 GitHub Pages

仓库已经包含 `.github/workflows/deploy-pages.yml`：

1. 打开 GitHub 仓库的 `Settings` → `Pages`。
2. 在 `Build and deployment` 的 `Source` 中选择 `GitHub Actions`。
3. 推送 `main` 后进入 `Actions`，等待 `Deploy Yuye Museum to GitHub Pages` 完成。
4. 当前部署地址为 `https://graychan04.github.io/YuyeMuseum/`。

项目采用相对资源路径，同一份构建也兼容 `用户名.github.io` 用户站点仓库。

## 部署故障排查

- Action 在 `npm ci` 失败：确认 `package-lock.json` 已提交，Node 版本与工作流一致。
- 页面能打开但样式丢失：不要把 Vite 的 `base` 改成 `/`；当前 `./` 用于兼容项目站点路径。
- 工作流没有部署权限：检查 `Settings` → `Actions` → `General` 中是否允许 Actions，以及 Pages Source 是否选为 GitHub Actions。
- 推送认证失败：使用 GitHub 支持的令牌、凭据管理器或 SSH，不使用账号密码。

## V1.5 的真实边界

- 仓库不再包含虚构馆藏、演示留言或演示媒体；真实馆藏需在核实后手工录入。
- 留言、回复、意见和版权反馈表单是完整前端原型，但不会发送、上传或保存数据。
- 表单不会写入 localStorage、GitHub Issue 或任何远端服务。
- 真实互动需要后续接入安全的数据服务和审核流程。
- 本馆与艺人官方及经纪公司无关，素材版权归原作者所有。
