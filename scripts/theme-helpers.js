/**
 * 主题通用助手
 *
 * is_external(url) → true 表示站外链接
 *
 * 用途：侧边栏导航、社交按钮里既有站内路由（/、/archives、/success/），
 *      也有站外地址（https://github.com/...），以前一律 target="_blank"，
 *      结果点「首页」也新开一个标签页。现在按域名判断：
 *      - 以 / 或 # 开头          → 站内
 *      - 域名等于 _config.yml 的 url → 站内
 *      - 其余绝对地址            → 站外
 */
'use strict';

hexo.extend.helper.register('is_external', function (url) {
  if (!url) return false;

  const s = String(url).trim();
  if (!s) return false;

  // 锚点、邮件、电话：都不是跨站跳转
  if (/^(#|mailto:|tel:|javascript:)/i.test(s)) return false;

  // 相对路径（含 / 开头的根路径）一律站内
  if (!/^https?:\/\//i.test(s)) return false;

  const siteHost = String(hexo.config.url || '')
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase();

  const targetHost = s
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    .toLowerCase();

  if (!siteHost) return true;
  return targetHost !== siteHost;
});
