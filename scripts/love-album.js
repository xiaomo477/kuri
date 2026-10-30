/**
 * 爱心小屋 · 相册自动扫描
 *
 * 作用：把图片丢进 source/images/love/ 后，重新 generate 就自动出现在 /album/ 页面，
 *      不需要在配置文件里登记任何一条。
 *
 * 排序：按文件名自然排序（01-xx.jpg → 02-xx.jpg → 03-xx.jpg …）
 * 说明文字：取文件名，自动去掉开头的序号（"01 第一次看海" → "第一次看海"）
 *         想换说明文字，直接重命名文件即可。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PHOTO_DIR = path.join('source', 'images', 'love');
const EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp'];

let cache = null;

function scan(baseDir) {
  const dir = path.join(baseDir, PHOTO_DIR);
  let entries = [];

  try {
    entries = fs.readdirSync(dir);
  } catch (err) {
    return [];
  }

  return entries
    .filter(function (name) {
      return EXTS.indexOf(path.extname(name).toLowerCase()) !== -1;
    })
    .filter(function (name) {
      // 跳过隐藏文件（含 macOS 的 ._xxx.jpg）
      return name.charAt(0) !== '.';
    })
    .sort(function (a, b) {
      return a.localeCompare(b, 'zh-CN', { numeric: true });
    })
    .map(function (name) {
      const base = path.basename(name, path.extname(name));
      return {
        src: '/images/love/' + encodeURIComponent(name),
        file: name,
        caption: base.replace(/^[0-9]+[\s._\-—]+/, '').trim() || base
      };
    });
}

hexo.extend.helper.register('love_photos', function () {
  if (!cache) cache = scan(hexo.base_dir);
  return cache;
});

hexo.extend.filter.register('before_generate', function () {
  cache = null;
});
