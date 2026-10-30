// Cloudflare Pages Function：/api/* → waline.xiaomoo.top/api/*
// 说明见 functions/_shared/proxy.js
import { proxyToWaline } from '../_shared/proxy.js';

export async function onRequest(context) {
  return proxyToWaline(context.request);
}
