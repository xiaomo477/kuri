/**
 * Waline 评论加载守护
 *
 * 背景：waline.xiaomoo.top 走 Cloudflare 洛杉矶节点（colo=LAX），跨境链路抖动大。
 *      实测单次评论 API：1.5s ~ 8s，约三成请求直接 20s 超时。
 *      Waline 自己不发请求超时，只能干等 20s，用户看到的就是"一直转圈"。
 *
 * 做法：
 *   1) 给发往评论后端的 fetch 加 9 秒超时 —— 早失败，早出 Waline 自带的"刷新"按钮
 *   2) 12 秒还没渲染出内容时，插一条可见提示 + 重新加载按钮
 *
 * 只拦评论后端的请求，站内其他 fetch 一律放行。
 */
(function () {
  'use strict';

  if (window.__wlCommentGuard) return;
  window.__wlCommentGuard = true;

  // 与 _config.kuri.yml 的 comment.server_url 保持一致
  var HOST = 'waline.xiaomoo.top';
  var SELF_ORIGIN = location.origin;
  var FETCH_TIMEOUT = 9000;
  var TIP_DELAY = 12000;

  // 判定"这是发给评论后端的请求"：跨域 + 路径命中 Waline 的 API
  // 用路径判断而不是写死域名，后端搬家后不用改这里
  function isWalineAPI(raw) {
    var u;
    try {
      u = new URL(raw, location.href);
    } catch (e) {
      return false;
    }
    if (u.origin === SELF_ORIGIN) return false;
    if (u.hostname === HOST) return true;
    return /\/api\/(comment|article|user)\b/.test(u.pathname) || /\/token\/?$/.test(u.pathname);
  }

  /* ---------- 1. fetch 超时 ---------- */

  var nativeFetch = window.fetch;

  if (typeof nativeFetch === 'function') {
    window.fetch = function (input, init) {
      var url = '';
      if (typeof input === 'string') {
        url = input;
      } else if (input && input.url) {
        url = input.url;
      } else if (input && typeof input.toString === 'function') {
        url = String(input);
      }

      if (!isWalineAPI(url)) {
        return nativeFetch.apply(this, arguments);
      }

      var ctrl = new AbortController();
      var timer = null;

      var opts = {};
      if (init) {
        for (var key in init) {
          if (Object.prototype.hasOwnProperty.call(init, key)) opts[key] = init[key];
        }
      }

      // Waline 自己也会传 signal（组件卸载时取消请求），两个都要保留
      var outer = init && init.signal;
      if (outer && typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
        opts.signal = AbortSignal.any([outer, ctrl.signal]);
      } else {
        opts.signal = ctrl.signal;
      }

      var pending = nativeFetch.call(this, input, opts);

      // 关键：不能直接靠 abort 报超时。
      // Waline 内部对 AbortError 是静默忽略的（那是它自己取消请求的信号），
      // 只认其他错误才会切到 error 态、显示"刷新"按钮。
      // 所以这里先 reject 一个普通错误让 Waline 走 error 分支，再 abort 掉真实请求。
      var timeoutLimit = new Promise(function (_, reject) {
        timer = setTimeout(function () {
          // 顺序要紧：abort() 是同步的，会立刻让 pending 以 AbortError 落定，
          // 先 abort 就被它抢先了。必须先抛普通错误，再断连接。
          reject(new TypeError('Waline request timeout (' + FETCH_TIMEOUT + 'ms)'));
          try { ctrl.abort(); } catch (e) {}
        }, FETCH_TIMEOUT);
      });

      function done() {
        if (timer) clearTimeout(timer);
      }

      pending.then(done, done);
      return Promise.race([pending, timeoutLimit]);
    };
  }

  /* ---------- 2. 慢加载提示 ---------- */

  function injectStyle() {
    if (document.getElementById('wl-slow-tip-style')) return;
    var s = document.createElement('style');
    s.id = 'wl-slow-tip-style';
    s.textContent =
      '.wl-slow-tip{' +
      'margin:0 0 1rem;padding:.9rem 1.1rem;border-radius:.9rem;' +
      'background:rgba(111,154,141,.1);border:1px solid rgba(111,154,141,.28);' +
      'display:flex;flex-wrap:wrap;align-items:center;gap:.6rem 1rem;' +
      'font-size:.9rem;line-height:1.6;color:#5d6b66;' +
      '}' +
      '.wl-slow-tip p{margin:0;flex:1 1 12rem;}' +
      '.wl-slow-tip button{' +
      'flex:0 0 auto;cursor:pointer;border:0;border-radius:.6rem;' +
      'padding:.4rem .95rem;font-size:.86rem;font-family:inherit;' +
      'background:#6f9a8d;color:#fff;transition:background .2s;' +
      '}' +
      '.wl-slow-tip button:hover{background:#5e8879;}' +
      '@media (prefers-color-scheme:dark){' +
      '.wl-slow-tip{background:rgba(111,154,141,.16);color:#c8d5d0;}' +
      '}';
    document.head.appendChild(s);
  }

  function showTip() {
    var box = document.getElementById('waline');
    if (!box) return;

    // 已经有内容（或空态）就不用提示
    if (box.querySelector('.wl-cards') || box.querySelector('.wl-empty')) return;
    if (document.querySelector('.wl-slow-tip')) return;

    injectStyle();

    var el = document.createElement('div');
    el.className = 'wl-slow-tip';
    el.innerHTML =
      '<p>评论区加载得有点久，多半是网络绕远了。</p>' +
      '<button type="button">重新加载</button>';

    var btn = el.querySelector('button');
    btn.addEventListener('click', function () {
      btn.disabled = true;
      btn.textContent = '加载中…';
      location.reload();
    });

    var host = box.parentNode;
    if (host) host.insertBefore(el, box);
  }

  function arm() {
    setTimeout(showTip, TIP_DELAY);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arm);
  } else {
    arm();
  }
})();
