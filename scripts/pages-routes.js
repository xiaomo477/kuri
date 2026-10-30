/**
 * 把 source/_routes.json 复制到 public/
 *
 * Hexo 约定以 `_` 开头的文件不参与渲染，所以 _routes.json 会被静默跳过。
 * Cloudflare Pages 又要求这个文件躺在构建输出目录的根上，用来声明
 * 哪些路径交给 Functions、哪些直接走静态资源。
 * 不补这一步，全站每个请求都会先进一次 Pages Function，白吃调用额度。
 */
'use strict';

const fs = require('fs');
const path = require('path');

hexo.extend.filter.register('after_generate', function () {
  const src = path.join(hexo.base_dir, 'source', '_routes.json');
  const dest = path.join(hexo.public_dir, '_routes.json');

  if (!fs.existsSync(src)) {
    hexo.log.warn('source/_routes.json 不存在，Pages 的 Functions 路由声明会缺失');
    return;
  }

  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    hexo.log.debug('已复制 _routes.json 到 public/');
  } catch (err) {
    hexo.log.error('复制 _routes.json 失败: ' + err.message);
  }
});
