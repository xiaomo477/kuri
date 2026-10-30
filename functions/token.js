// Cloudflare Pages Function：/token → waline.xiaomoo.top/token
// 登录回调后浏览器用它换管理 token，漏了这一步后台登不进。
import { proxyToWaline } from './_shared/proxy.js';

export async function onRequest(context) {
  return proxyToWaline(context.request);
}
