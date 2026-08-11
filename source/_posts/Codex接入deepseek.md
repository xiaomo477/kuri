---
title: Codex接入deepseek
date: 2026-08-11 15:47:52
tags: 技术分享
---

7月31日deepseek可以正式接入图形化codex
- https://api-docs.deepseek.com/zh-cn/quick_start/agent_integrations/codex
- deepseek官方文章

### 一、准备工具
1.deepseek的API Key
- https://platform.deepseek.com/api_keys
- deepseek API Key获取
2.微软商店下载ChatGPT
下载完成后打开会出现登录账号界面，无需理会，直接关闭（关闭所有后台）。
codex的安装路径为C/user/你的用户名/.codex

### 二、一键配置脚本
1.windows用户打开PowerShell并执行
```bash
irm https://cdn.deepseek.com/api-docs/codex-deepseek-setup-en.ps1 | iex
```
2.macos和linux用户在终端执行
```bash
bash <(curl -fsSL https://cdn.deepseek.com/api-docs/codex-deepseek-setup.sh)
```
3.运行后按菜单选择要使用的模型。首次运行会提示输入 API Key（以 sk- 开头，在 DeepSeek Platform 获取）。
推荐输入：1   选择deepseek-v4-flsah模型后
输入获取到的API Key

### 三、检查codex
打开图形化codex（注意下载的ChatGPT就是codex）查看右下角大模型是否为deepseek-v4-flsah

### 四、给codex添加识图功能
因为deepseek-v4-flsah是纯文本模型不支持图片的添加
这时候就需要GitHub上的开源项目Vision Skill
- https://github.com/asuojun/claude-vision-skill
- 开源地址
但是我们可以借助codex来安装识图模型 例如：qwen3.8-max
1.首先去阿里云百炼的平台获取大模型的API Key
2.将API Key放置在下面的提示词中
```bash
全局安装 Vision Skill (O https://github.com/asuojun/claude-vision-skill),按照
 新对话
README的说明进行配置。
3 拉取请求
视觉模型用通义千问的qwen3.8-max 
 已安排
API Key 为---输入你自己的API Key
```
3.安装识图工具后有可能还是无法粘贴图片，这可能是配置信息设置的原因可以把错误的提示交给codex来解决。

### 五、更改语言设置
codex设置中虽然有可能设置的是中文，但大多界面还是有可能为英文
这时可以让codex为你安装社区版中文汉化包。

### 六、coedx配置设置
如果codex不进行配置设置token的消耗量十分的快这时可以进入codex设置中的个性化设置提示词来减少token的使用。
以及进入C/user/用户名/.codex/config.toml 来调整codex的配置信息来节省token的使用。