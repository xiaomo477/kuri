# hexo-kuri 项目长期备忘

## 技术栈
- Hexo 8.1.2 + kuri 主题，MDUI 框架，Waline 评论
- 文章目录：`source/_posts/`，模板：`themes/kuri/layout/_partial/`
- 主题配置：`_config.kuri.yml`，站点配置：`_config.yml`
- 构建命令：`npx hexo clean && npx hexo generate`

## 关键坑位

### front-matter 解析失败会静默跳过文章
Hexo 遇到单篇文章 front-matter 解析失败时，**只打 ERROR 日志然后跳过这篇文章，构建整体仍然"成功"**。
表现是网站上看不到新文章，但 `hexo generate` 没报错。

排查命令（必须加 `--debug`，否则看不到 error 行）：
```bash
npx hexo generate --debug 2>&1 | grep -iE "error|warn"
```

常见原因（按出现频率排序）：
1. **冒号后缺空格**，如 `tags:技术分享`。YAML 要求 `key: value` 冒号后必须有空格，否则这段不是合法映射，直接解析失败。**手写 front-matter 时最容易犯**，一眼能看出来。
2. 从 Word / 网页 / 微信复制内容时带入**零宽空格 U+200B** 等不可见字符，污染了 `---` 分隔符行（肉眼看不见，需脚本检查）。
检查脚本（Python）：
```python
import unicodedata, collections
t = open('source/_posts/xxx.md', encoding='utf-8').read()
print(collections.Counter(ch for ch in t if 0x2000 <= ord(ch) <= 0x206f or ord(ch) in (0xfeff, 0xa0)))
```

正确的 front-matter 格式（本博客惯例）：
```
---
title: 标题
date: 2026-09-15 16:02:32
tags: 技术分享
---
```

### 其他
- kuri 主题模板**不使用 `categories` 字段**，写了不生效，用 `tags` 即可。
- 文章头部备份放 `.workbuddy/backup/`。
- 主题 CSS（`themes/kuri/source/css/style.css`）已于 2026-09-17 修复手机端整页横向溢出：
  移动端断点用 `display: block` 取代纵向 flex；`.post-content pre/table` 均为块内横向滚动。
  改主题布局时注意 `.blog-main { flex: 1 1 0 }` 只在横向 flex 下约束宽度。
- 主题 head 里的 `@import fonts.googleapis.com` 在本机网络挂起（TLS 被断），
  本地浏览器调试时页面 load 事件等不到属正常，文档实际已加载。
- 本地预览：`npx hexo server -p 4319`；浏览器调试用 agent-browser + 本机 Edge
  （`AGENT_BROWSER_EXECUTABLE_PATH` 指向 msedge.exe，Chrome 内核下载被墙）。
