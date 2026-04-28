# Star Tales

Star Tales 是一个仍处于前端开发阶段的应用式网站。项目目标是让用户借助 AI 创建自己的“角色”，并将这些角色放入预设故事中，进一步对已有故事进行改编、续写与再创作。

当前版本主要聚焦于网站入口、欢迎页视觉效果、基础页面结构与前端交互体验。产品能力、故事系统、AI 接入方式和用户功能仍在持续设计与开发中。

## 项目状态

- 开发阶段：前端开发中
- 当前重点：欢迎页、视觉表现、基础交互与项目结构
- 后续方向：角色创建、故事选择、AI 改写流程、用户数据与内容管理

## 技术栈

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [pnpm](https://pnpm.io/)

## 功能规划

- AI 角色创建：让用户生成或编辑可参与故事的原创角色。
- 故事融合：将用户角色放入预设故事背景中。
- 故事改编：基于用户输入与 AI 生成能力，对故事进行续写、重构或分支创作。
- 应用式体验：以更接近产品应用的方式组织页面、动画与交互流程。

## 本地开发

请先确保本地已安装 Node.js 和 pnpm。

```bash
pnpm install
pnpm dev
```

启动后在浏览器中打开：

```text
http://localhost:3000
```

## 常用脚本

```bash
pnpm dev
```

启动本地开发服务器。

```bash
pnpm build
```

构建生产版本。

```bash
pnpm lint
```

运行 ESLint 检查。

```bash
pnpm build:backgrounds
```

根据源图生成不同尺寸的背景资源。

## 项目结构

```text
src/
  app/                 Next.js App Router 页面与全局样式
  components/          页面组件与欢迎页相关组件
  config/              前端配置
  hooks/               React Hooks
  lib/                 通用工具与纹理生成逻辑
  mocks/               前端开发阶段使用的模拟数据
public/
  backgrounds/         页面背景资源
scripts/               项目脚本
```

## 说明

本项目仍处于早期开发阶段，README 中的功能描述会随着产品设计和实现进度继续调整。当前仓库内容以展示和推进前端开发为主，尚不代表最终产品形态。
