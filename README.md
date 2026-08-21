# 榆野博物馆

榆野博物馆是一个使用 Vue 3 + Vite 构建的粉丝自发线上展示馆。V1 用两件明确标注的演示馆藏验证关键词搜索、纵向时间轴、小草坪和响应式体验，不包含未经核实的真实粉圈历史。

完整产品范围见 [Inputs/需求文档-v1.1.md](Inputs/需求文档-v1.1.md)。

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
- `/#/keyword/label-number-01`：关键词时间轴
- `/#/lawn`：小草坪
- `/#/about`：关于本馆

项目使用 Hash 路由，确保 GitHub Pages 上直接打开和刷新页面时不会因服务器缺少路由回退而出现 404。

## 更新馆藏内容

关键词和时间轴位于 `src/data/keywords.json`。新增馆藏时：

1. 复制一个现有关键词对象并修改唯一 `id`。
2. 填写 `name`、`aliases`、`summary`、`startTime`、`intro`、`origin` 和 `curatorNote`。
3. 在 `nodes` 中按月份添加节点；页面会自动按 `time` 排序。
4. 图片放入 `public/`，JSON 中只写相对于 `public/` 的路径。
5. 本地音频同样放入 `public/`；视频只填写外部平台链接，不下载、不内嵌。
6. 每份素材填写来源平台、账号、说明，并尽量补充原始链接。
7. 真实内容准备好后移除 `isDemo`，同时确保文字和素材已经馆主核实。

小草坪演示数据位于 `src/data/community.json`。V1 不保存访客输入，不要把 GitHub 写入令牌或管理员凭据放进前端代码。

## 连接 GitHub 仓库

本机当前没有 GitHub CLI，推荐先在 GitHub 网页创建一个空仓库，例如 `YuyeMuseum`。不要勾选自动创建 README，以免第一次推送发生历史冲突。

在项目目录中执行：

```bash
git init
git add .
git commit -m "feat: launch Yuye Museum v1"
git branch -M main
git remote add origin https://github.com/你的用户名/YuyeMuseum.git
git push -u origin main
```

认证时不要把 GitHub 密码发给任何人。GitHub 的 Git 操作应使用浏览器凭据管理器、SSH 密钥或个人访问令牌；敏感凭据只在系统认证提示中由你本人输入，不写进命令、聊天、文件或仓库。

## 启用 GitHub Pages

仓库已经包含 `.github/workflows/deploy-pages.yml`：

1. 打开 GitHub 仓库的 `Settings` → `Pages`。
2. 在 `Build and deployment` 的 `Source` 中选择 `GitHub Actions`。
3. 推送 `main` 后进入 `Actions`，等待 `Deploy Yuye Museum to GitHub Pages` 完成。
4. 部署地址通常为 `https://你的用户名.github.io/YuyeMuseum/`。

项目采用相对资源路径，同一份构建也兼容 `用户名.github.io` 用户站点仓库。

## 部署故障排查

- Action 在 `npm ci` 失败：确认 `package-lock.json` 已提交，Node 版本与工作流一致。
- 页面能打开但样式丢失：不要把 Vite 的 `base` 改成 `/`；当前 `./` 用于兼容项目站点路径。
- 工作流没有部署权限：检查 `Settings` → `Actions` → `General` 中是否允许 Actions，以及 Pages Source 是否选为 GitHub Actions。
- 推送认证失败：使用 GitHub 支持的令牌、凭据管理器或 SSH，不使用账号密码。

## V1 的真实边界

- 两件馆藏、小草坪留言和意见全部是演示内容。
- 留言、回复、意见和版权反馈表单均不会发送或保存数据。
- 真实互动需要后续接入安全的数据服务和审核流程。
- 本馆与艺人官方及经纪公司无关，素材版权归原作者所有。
