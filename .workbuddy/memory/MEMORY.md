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

常见原因：从 Word / 网页 / 微信复制内容时带入**零宽空格 U+200B** 等不可见字符，污染了 `---` 分隔符行。
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
