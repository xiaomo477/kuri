/* 前端渲染演示：Canvas 粒子星链 + 鼠标交互
 * 想换成 Three.js / ECharts / Vue，只需保留 init/destroy 结构，替换 draw() 内部实现。
 */
(function () {
  'use strict';

  var canvas = document.getElementById('lab-canvas');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var FPS_EL = document.getElementById('lab-fps');
  var COUNT_EL = document.getElementById('lab-count');

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0;
  var H = 0;
  var particles = [];
  var mouse = { x: -9999, y: -9999 };
  var rafId = null;
  var lastTs = 0;
  var fpsAcc = 0;
  var fpsFrames = 0;

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var COLORS = ['#66CCFF', '#9b7bff', '#ff7bb0', '#7bffb0'];

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
  }

  function seed() {
    // 屏幕越大粒子越多，上限防止低端机卡顿
    var count = Math.min(Math.round((W * H) / 16000), 140);
    particles = [];
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r: Math.random() * 1.8 + 0.9,
        color: COLORS[i % COLORS.length]
      });
    }
    if (COUNT_EL) COUNT_EL.textContent = String(count);
  }

  function step() {
    var linkDist = 130;
    var i, j, p, q, dx, dy, dist;

    for (i = 0; i < particles.length; i++) {
      p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      // 边界反弹
      if (p.x < 0 || p.x > W) { p.vx *= -1; p.x = Math.min(Math.max(p.x, 0), W); }
      if (p.y < 0 || p.y > H) { p.vy *= -1; p.y = Math.min(Math.max(p.y, 0), H); }

      // 鼠标轻微排斥
      dx = p.x - mouse.x;
      dy = p.y - mouse.y;
      dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 110 && dist > 0.01) {
        var force = (110 - dist) / 110 * 1.4;
        p.x += (dx / dist) * force;
        p.y += (dy / dist) * force;
      }
    }

    // 连线
    for (i = 0; i < particles.length; i++) {
      p = particles[i];
      for (j = i + 1; j < particles.length; j++) {
        q = particles[j];
        dx = p.x - q.x;
        dy = p.y - q.y;
        dist = dx * dx + dy * dy;
        if (dist < linkDist * linkDist) {
          var alpha = (1 - dist / (linkDist * linkDist)) * 0.35;
          ctx.strokeStyle = 'rgba(160, 210, 255, ' + alpha.toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }

    // 粒子本体
    for (i = 0; i < particles.length; i++) {
      p = particles[i];
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.85;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame(ts) {
    var dt = lastTs ? ts - lastTs : 16;
    lastTs = ts;

    if (FPS_EL) {
      fpsAcc += dt;
      fpsFrames++;
      if (fpsAcc >= 500) {
        FPS_EL.textContent = Math.round((fpsFrames * 1000) / fpsAcc);
        fpsAcc = 0;
        fpsFrames = 0;
      }
    }

    ctx.clearRect(0, 0, W, H);
    step();
    rafId = window.requestAnimationFrame(frame);
  }

  function init() {
    resize();
    window.addEventListener('resize', resize, { passive: true });

    window.addEventListener('mousemove', function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });

    window.addEventListener('mouseleave', function () {
      mouse.x = -9999;
      mouse.y = -9999;
    }, { passive: true });

    if (reduceMotion) {
      // 尊重系统「减少动态效果」：只画一帧静态图
      step();
      return;
    }
    rafId = window.requestAnimationFrame(frame);
  }

  // 离开页面时停掉循环，避免后台标签页空转耗电
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (rafId) { window.cancelAnimationFrame(rafId); rafId = null; }
    } else if (!reduceMotion && !rafId) {
      lastTs = 0;
      rafId = window.requestAnimationFrame(frame);
    }
  });

  init();
})();
