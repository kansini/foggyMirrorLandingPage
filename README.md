# 雾镜 · Foggy Mirror

雾镜 App 的中英双语响应式落地页，使用 Vue 3、TypeScript、Sass、GSAP 和 Canvas 2D。所有图片均为项目本地素材，无远程字体或图片依赖。

页面以「呼——雾里见」为主题：海报式大字、独立的可擦雾镜面、可切换的心情气象台，以及错落排列的心情明信片。中文和英文有各自的字体比例与断行规则。

## 语言与主题

页头可随时切换中文／英文、浅色／深色。双语覆盖正文、FAQ、弹窗、图片说明和无障碍标签，同时更新页面标题、描述和 `html lang`。

首次打开时主题跟随系统；手动切换后保存选择。语言默认中文。偏好仅保存在当前浏览器的 `localStorage` 中（`foggy-mirror-language`、`foggy-mirror-theme`），存储不可用时仍可在当前页面切换。主题在页面加载的早期初始化，减少明暗闪烁。

## 本地开发

```sh
npm run dev
```

## 类型检查与生产构建

```sh
npm run build
```

构建命令依次执行 `vue-tsc -b` 和 `vite build`，静态产物位于 `dist/`。按项目验证约定，仅执行类型与构建检查，不运行功能、浏览器 UI 或性能测试。

## 文件与内容

- `src/App.vue`：页面结构、文案、镜面风格、FAQ、隐私说明、App 实际界面预览与 App Store 链接。
- `src/content.ts`：中英文文案与共享内容类型。
- `src/composables/usePreferences.ts`：语言、主题、偏好保存、系统主题同步与元信息更新。
- `src/components/FogMirror.vue`：网页擦雾示意，支持鼠标与触屏、重新起雾、一键画心、风格联动和窗口变化后保留笔迹。使用本地橘猫图片，不调用相机或麦克风，不上传笔迹。
- `src/components/AppIcon.vue`：统一的 SVG 图标。
- `src/styles/main.scss`：明暗主题变量、组件样式、双语排版及桌面、平板、手机布局。
- `public/images/`：来自雾镜现有品牌与营销资料的插画、橘猫图片与真实 App 界面。照片背景上的手写内容为创意场景示意。
- `index.html`：页面标题、中文描述与分享元信息。

动画尊重系统「减少动态效果」偏好；原生 FAQ 与对话框支持键盘操作。
