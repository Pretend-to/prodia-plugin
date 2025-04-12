# Prodia Plugin

## 简介

Prodia Plugin 是一个为 *MioChat* 设计的，用于调用 *Prodia API* 生成图片的插件。

## 安装

```bash
# 移动到 MioChat 的插件目录下
cd plugins
# 克隆仓库
git clone https://github.com/Pretend-to/prodia-plugin
# 安装依赖
pnpm i 
```

## 使用

### 获取 API Key

1. 注册登录 https://app.prodia.com/api 开通 API。
2. 把 token 填入 miochat 根目录下的 `config/plugins/prodia-plugin.json` 中即可。

### 工具调用

目前支持的工具有：

- `flux-pro`、`flux-dev` 模型绘图。