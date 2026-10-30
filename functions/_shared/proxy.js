/**
 * Cloudflare Pages 边缘反代：把评论后端的请求同源化
 *
 * 为什么要这么做
 * -------------
 * 评论后端的域名 waline.xiaomoo.top 落在 Cloudflare 洛杉矶节点（colo=LAX）。
 * 浏览器直连它，每次都要重新 DNS + TLS 握手，实测抖动 0.6s~8.5s，
 * 三成请求直接 20s 超时 —— 这是"评论卡住"的根源。
 *
 * 改成走主站同源 /api/* 之后：
 *   - 复用主站已经建立好的连接，不再多一次跨境 TLS
 *   - Pages Function 在边缘执行，边缘到边缘走 Cloudflare 内部网络
 *
 * 被代理的路径（与 Waline 路由一一对应，漏一个就 404）：
 *   /api/*  评论、计数、用户、RSS
 *   /ui/*   管理后台登录页
 *   /token  登录回调换 token
 */

const ORIGIN = 'https://waline.xiaomoo.top';

// 这些头由 Cloudflare 自己决定，透传给上游会让后端误判来源
const DROP_REQUEST_HEADERS = [
  'host',
  'cf-connecting-ip',
  'cf-connecting-ipv6',
  'cf-ipcountry',
  'cf-ipcity',
  'cf-ray',
  'cf-visitor',
  'cf-worker',
  'cf-ew-via',
  'cdn-loop',
  'x-real-ip',
  'x-forwarded-proto',
];

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function proxyToWaline(request) {
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, ORIGIN);

  const headers = new Headers(request.headers);
  for (const name of DROP_REQUEST_HEADERS) headers.delete(name);

  const method = request.method.toUpperCase();
  const canHaveBody = method !== 'GET' && method !== 'HEAD';

  /** @type {RequestInit} */
  const init = {
    method,
    headers,
    // 3xx 原样交回给浏览器，避免在这里被跟随后丢失方法
    redirect: 'manual',
  };

  if (canHaveBody && request.body) {
    init.body = request.body;
  }

  const upstream = await fetch(target.toString(), init);

  // 原样透传。不在这里改 content-encoding / content-length：
  // Workers 的 subrequest 会自动解压并同步修正这两个头，手工删反而会破坏响应。
  return upstream;
}
