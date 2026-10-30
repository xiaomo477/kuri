/**
 * 爱心小屋 · 点点滴滴（碎碎念）生成器
 *
 * 用法：在 source/_love_notes/ 下新建 .md 文件，一篇文章一个文件。
 *
 *   ---
 *   title: 今天她笑了很久
 *   date: 2026-10-25
 *   author: 小罐
 *   ---
 *
 *   正文随便写，支持 Markdown。
 *
 * 生成：
 *   /love/notes/            列表页（按日期倒序）
 *   /love/notes/<文件名>/    详情页
 */
'use strict';

const fs = require('fs');
const path = require('path');

// hexo-front-matter 是 hexo 的间接依赖，正常情况下一定存在；
// 万一某个构建环境里装不上，用极简解析兜底，避免整站构建失败。
let frontMatter;
try {
  frontMatter = require('hexo-front-matter');
} catch (err) {
  frontMatter = {
    parse: function (raw) {
      const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
      if (!m) return { _content: raw };
      const data = { _content: raw.slice(m[0].length) };
      m[1].split(/\r?\n/).forEach(function (line) {
        const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line.trim());
        if (kv) data[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '');
      });
      return data;
    }
  };
}

const SRC_DIR = path.join('source', '_love_notes');

function readNotes(baseDir) {
  const dir = path.join(baseDir, SRC_DIR);
  let files = [];

  try {
    files = fs.readdirSync(dir);
  } catch (err) {
    return [];
  }

  return files
    .filter(function (name) {
      return /\.md$/i.test(name) && name.charAt(0) !== '.';
    })
    .map(function (name) {
      const slug = name.replace(/\.md$/i, '');
      const full = path.join(dir, name);
      const raw = fs.readFileSync(full, 'utf8');
      let data = {};
      let body = raw;

      try {
        const parsed = frontMatter.parse(raw);
        data = parsed || {};
        body = (data._content || '').trim();
      } catch (err) {
        body = raw;
      }

      const stat = fs.statSync(full);
      const date = data.date ? new Date(data.date) : stat.mtime;
      const safeDate = isNaN(date.getTime()) ? stat.mtime : date;

      return {
        slug: slug,
        title: data.title || slug,
        author: data.author || '',
        date: safeDate,
        dateText:
          safeDate.getFullYear() +
          '-' +
          String(safeDate.getMonth() + 1).padStart(2, '0') +
          '-' +
          String(safeDate.getDate()).padStart(2, '0'),
        body: body
      };
    })
    .sort(function (a, b) {
      return b.date - a.date;
    });
}

hexo.extend.generator.register('love_notes', function () {
  const notes = readNotes(hexo.base_dir);
  const routes = [];

  routes.push({
    path: 'love/notes/index.html',
    layout: 'love-notes',
    data: { title: '点点滴滴', notes: notes }
  });

  notes.forEach(function (note) {
    let html = '';
    try {
      html = hexo.render.renderSync({ text: note.body, engine: 'markdown' });
    } catch (err) {
      html = '<p>' + note.body + '</p>';
    }

    routes.push({
      path: 'love/notes/' + note.slug + '/index.html',
      layout: 'love-note',
      data: {
        title: note.title,
        note: note,
        content: html
      }
    });
  });

  return routes;
});
