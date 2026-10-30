// Cloudflare Pages Function：/ui/* → waline.xiaomoo.top/ui/*
// Waline 管理后台的登录页在这里，不代理会导致后台进不去。
import { proxyToWaline } from '../_shared/proxy.js';

export async function onRequest(context) {
  return proxyToWaline(context.request);
}
