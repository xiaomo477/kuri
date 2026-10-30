/* 爱心小屋 · 玻璃雨滴 canvas 效果 */
(function () {
	'use strict';

	var canvas = document.getElementById('love-rain');
	if (!canvas || !canvas.getContext) return;

	var ctx = canvas.getContext('2d');
	if (!ctx) return;

	var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var DPR = Math.min(window.devicePixelRatio || 1, 2);
	var W = 0;
	var H = 0;
	var limitY = 0;
	var drops = [];
	var raf = 0;
	var last = 0;

	function sheetTop() {
		var sheet = document.querySelector('.love-sheet');
		if (!sheet) return H;
		var top = sheet.getBoundingClientRect().top;
		return top > 0 ? top : H;
	}

	function makeDrop(spawnTop) {
		var r = 1.5 + Math.random() * 3.4;
		return {
			x: Math.random() * W,
			y: spawnTop ? -Math.random() * 120 : Math.random() * limitY,
			r: r,
			vy: (0.04 + Math.random() * 0.34) * (r > 2.6 ? 1.9 : 1),
			vx: (Math.random() - 0.5) * 0.09,
			still: Math.random() < 0.45,
			trail: []
		};
	}

	function seed() {
		var wanted = Math.min(150, Math.max(40, Math.round((W * H) / 20000)));
		drops = [];
		for (var i = 0; i < wanted; i++) drops.push(makeDrop(false));
	}

	function resize() {
		W = canvas.clientWidth || window.innerWidth;
		H = canvas.clientHeight || window.innerHeight;
		canvas.width = Math.round(W * DPR);
		canvas.height = Math.round(H * DPR);
		ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
		limitY = Math.max(100, sheetTop() - 8);
		seed();
		render();
	}

	function paintTrail(d) {
		var len = d.trail.length;
		for (var i = 0; i < len; i++) {
			var p = d.trail[i];
			var k = (i + 1) / len;
			ctx.fillStyle = 'rgba(255,255,255,' + (0.1 * k) + ')';
			ctx.beginPath();
			ctx.arc(p.x, p.y, Math.max(0.4, p.r * 0.55 * k), 0, Math.PI * 2);
			ctx.fill();
		}
	}

	function paintDrop(d) {
		if (d.y < -12) return;
		var r = d.r;

		var glow = ctx.createRadialGradient(d.x - r * 0.35, d.y - r * 0.45, r * 0.1, d.x, d.y, r * 2.6);
		glow.addColorStop(0, 'rgba(255,255,255,.55)');
		glow.addColorStop(0.4, 'rgba(255,255,255,.18)');
		glow.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(d.x, d.y, r * 2.6, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = 'rgba(22,30,24,.24)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(d.x, d.y, r * 0.95, 0, Math.PI * 2);
		ctx.stroke();

		ctx.fillStyle = 'rgba(255,255,255,.72)';
		ctx.beginPath();
		ctx.ellipse(d.x - r * 0.3, d.y - r * 0.35, Math.max(0.5, r * 0.3), Math.max(0.4, r * 0.22), -0.6, 0, Math.PI * 2);
		ctx.fill();
	}

	function render() {
		ctx.clearRect(0, 0, W, H);
		for (var i = 0; i < drops.length; i++) {
			paintTrail(drops[i]);
			paintDrop(drops[i]);
		}
	}

	function step(d) {
		if (d.still) {
			if (Math.random() < 0.004) d.still = false;
			return;
		}
		d.y += d.vy;
		d.x += d.vx;
		d.trail.push({ x: d.x, y: d.y, r: d.r });
		if (d.trail.length > 10) d.trail.shift();
		if (d.y > limitY || d.x < -24 || d.x > W + 24) {
			var nd = makeDrop(true);
			d.x = nd.x;
			d.y = -18;
			d.r = nd.r;
			d.vy = nd.vy;
			d.vx = nd.vx;
			d.still = Math.random() < 0.35;
			d.trail.length = 0;
		}
	}

	function frame(now) {
		if (!last) last = now;
		var dt = Math.min(48, now - last) / 16.67;
		last = now;
		for (var i = 0; i < drops.length; i++) {
			step(drops[i]);
			if (dt > 1.4 && !drops[i].still) step(drops[i]);
		}
		render();
		raf = window.requestAnimationFrame(frame);
	}

	function start() {
		if (running || reduce) return;
		running = true;
		last = 0;
		raf = window.requestAnimationFrame(frame);
	}

	function stop() {
		running = false;
		if (raf) window.cancelAnimationFrame(raf);
		raf = 0;
	}

	window.addEventListener('resize', resize);
	document.addEventListener('visibilitychange', function () {
		if (document.hidden) stop();
		else start();
	});

	resize();
	if (!reduce) start();

	var scrollBtn = document.querySelector('.love-fab--scroll');
	if (scrollBtn) {
		scrollBtn.addEventListener('click', function () {
			var sheet = document.querySelector('.love-sheet');
			if (sheet && sheet.scrollIntoView) {
				sheet.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
			}
		});
	}
})();
