# 对 AI 编码代理的快速指南 — prodia-plugin

此文档用于让 AI 助手快速在本仓库中变得高产。请直接遵循可操作的规则和示例。只记录可从代码中发现的现实约定与工作流。

- 项目概览：这是一个为 MioChat 提供的 Prodia 插件，入口是 `index.js`，插件类继承自 `../../lib/plugin.js`。主要工具实现放在 `tools/` 下，以 `MioFunction` 子类的形式暴露。示例：`tools/drawPainting.js`, `tools/editImage.js`。

- 运行与依赖：仓库使用 ESM（package.json 中 `type: "module"`）。依赖由 pnpm 管理。参考 README 中的安装命令：

  - 在父项目（MioChat）中安装：

    pnpm --filter prodia-plugin install

- 配置要点：插件依赖 Prodia API token。配置文件位置（在 MioChat 根目录）：

  `config/plugins/prodia-plugin.json` — 含字段 `token`。

- 工具模式与参数（从代码可见，直接照搬）：

  - drawPainting (`tools/drawPainting.js`)
    - 参数: `prompt` (string, required), `orientation` (landscape|portrait|square), `quality` (fast|high)
    - 行为: 根据 orientation 设置 width/height，quality 选择 job 类型：`inference.flux.dev.txt2img.v1` (fast) 或 `inference.flux.pro.txt2img.v1` (high)。函数会将生成的二进制转换为 URL 并返回 `{ url }`。
    - 重试: 内置最多 3 次重试（maxRetries = 3），每次重试有指数延迟（1s,2s,3s）。

  - editImage (`tools/editImage.js`)
    - 参数: `prompt` (string, required), `source` (string[] of image URLs, required), `model` (enum: 'nano-banana','qwen.image-edit.lightning','seedream-4','flux-kontext.pro')
    - 行为: 下载 source 图片 buffers，调用 Prodia 的 img2img 接口：`inference.<model>.img2img.v1`，同样返回 `{ url }`，并有相同的重试策略。

- 关键内部 API 与约定（可直接在 agent 的修改/生成代码中使用）：

  - 从插件获取配置：`this.getPluginConfig()`（用于读取 token）。
  - 将 buffer 上传并获取可访问图片 URL：`this.getImgUrlFromBuffer(originUrl, buffer)`（在 MioFunction 基类中实现，不要重写调用约定）。
  - 每个工具的 constructor 中会将 `this.func = this.<methodName>` 以便框架注册函数。

- 故障与调试线索：
  - 如果没有 token，函数会抛出 `Error('请先配置Prodia token')`。检查 `config/plugins/prodia-plugin.json`。
  - 网络/API 错误会被捕获并重试，最终仍失败会抛出 `Error('绘图失败，请稍后重试')`。
  - 在本仓库上下文，日志使用 `console.error`。当修改时请保留并尽量在 catch 中打印关键字段（job id / status / error.message）。

- 编辑/扩展注意事项（基于现有模式）：
  - 继续使用类继承 `MioFunction` 的模式并在 constructor 中定义 JSON Schema `parameters`（见两个工具示例）。
  - 使用 `createProdia({ token })` 来构造客户端并调用 `prodia.job(...)`。不要修改 job types 的命名规则，直接按当前字符串拼接（如 `inference.${model}.img2img.v1`）。
  - 保持返回值为 `{ url }`，框架期望工具返回对象包含最终可访问图片链接。

- 当合并已有 `.github/copilot-instructions.md` 时：保留任何项目特定的说明（例如自定义运行/测试脚本）。若出现冲突，优先保留本文件中的“运行与依赖”与“配置要点”段落，因为它们可直接影响开发者能否起步。

如果以上某处信息不完整或你需要示例命令/快速测试脚本（例如一个小脚本调用 `drawPainting`），告诉我我会补充并把它加入到仓库中。
