/**
 * 爱心小屋 · 相册自动扫描
 *
 * 作用：把图片丢进 source/images/love/ 后，重新 generate 就自动出现在 /album/ 页面。
 *      配置了 love.album 分组时，这里扫到的图会归进「还没分组」那一栏。
 *
 * 排序：按文件名自然排序（01-xx.jpg → 02-xx.jpg → 03-xx.jpg …）
 * 说明文字：取文件名，自动去掉开头的序号（"01 第一次看海" → "第一次看海"）
 *         像 1793424075100.jpg、5f0cd553-8b99-4ce9-a155-….jpg 这种相机/微信随手名，
 *         图注留空，不显示一串乱码。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PHOTO_DIR = path.join('source', 'images', 'love');
const EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp'];

let cache = null;

// 判断文件名是不是「无意义的名字」：纯数字、UUID、长串哈希
function isNoisy(name) {
  if (/^\d+$/.test(name)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name)) return true;
  if (/^(mmexport|IMG|DSC|PX|VID|Screenshot|微信图片)/i.test(name)) return true;
  // 没有中文、没有空格、长度超过 16 的，多半是设备或哈希生成的名字
  if (name.length > 16 && !/[\u4e00-\u9fa5\s]/.test(name)) return true;
  return false;
}

function captionOf(name) {
  const base = name.replace(/\.[^.]+$/, '');
  const stripped = base.replace(/^[0-9]+[\s._\-—]+/, '').trim();
  if (stripped !== base) {
    // 有「序号 + 说明」的写法，说明用户自己取过名
    return stripped || '';
  }
  return isNoisy(base) ? '' : base;
}

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
      return {
        src: '/images/love/' + encodeURIComponent(name),
        file: name,
        caption: captionOf(name)
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
