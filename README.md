# Prodia Plugin

## 简介

Prodia Plugin 是一个为 *MioChat* 设计的，用于调用 *Prodia API* 生成图片的插件。

> 如果您并不知道什么是 MioChat , 请先访问 MioChat 项目地址 : [MioChat](https://github.com/Pretend-to/mio-chat-backend)

## 安装

```bash
# 克隆到插件目录
git clone https://github.com/Pretend-to/prodia-plugin plugins/prodia-plugin
# 安装依赖
pnpm --filter prodia-plugin install
```

## 使用

### 获取 API Key

1. 注册登录 https://app.prodia.com/api 开通 API。
2. 把 token 填入 miochat 根目录下的 `config/plugins/prodia-plugin.json` 中即可。

### 工具调用

目前支持的工具有：

- `flux-pro`、`flux-dev` 模型绘图。
- `nano banana`、 `qwen-edit`、`seedream-4`、`flux-kontext` 模型改图。
