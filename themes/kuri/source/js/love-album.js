/* 爱心小屋 · 相册大图查看 */
(function () {
	'use strict';

	var dataEl = document.getElementById('lp-photo-data');
	var viewer = document.querySelector('.lp-viewer');
	if (!dataEl || !viewer) return;

	var photos;
	try {
		photos = JSON.parse(dataEl.textContent || '[]');
	} catch (err) {
		return;
	}
	if (!photos.length) return;

	var stageImg = viewer.querySelector('img');
	var capEl = viewer.querySelector('.lp-viewer-cap');
	// 相册可能分成多栏（时间 + 事件），按 data-index 取全局下标，不能靠 DOM 顺序
	var shots = [].slice.call(document.querySelectorAll('.lp-shot[data-index]'));
	var btnClose = viewer.querySelector('.lp-viewer-close');
	var btnPrev = viewer.querySelector('.lp-viewer-prev');
	var btnNext = viewer.querySelector('.lp-viewer-next');

	var index = 0;
	var lastFocus = null;
	var closeTimer = null;

	function render(i) {
		index = (i + photos.length) % photos.length;
		var item = photos[index];
		stageImg.src = item.src;
		stageImg.alt = item.caption || '';
		if (capEl) capEl.textContent = item.caption || '';
	}

	function open(i) {
		lastFocus = document.activeElement;
		render(i);
		viewer.hidden = false;
		document.body.style.overflow = 'hidden';
		// 触发过渡
		void viewer.offsetWidth;
		viewer.classList.add('is-open');
		if (btnClose) btnClose.focus({ preventScroll: true });
	}

	function close() {
		viewer.classList.remove('is-open');
		document.body.style.overflow = '';
		clearTimeout(closeTimer);
		closeTimer = setTimeout(function () {
			viewer.hidden = true;
			stageImg.removeAttribute('src');
		}, 220);
		if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
	}

	shots.forEach(function (shot) {
		var i = parseInt(shot.getAttribute('data-index'), 10);
		if (isNaN(i)) return;
		shot.addEventListener('click', function () { open(i); });
		shot.addEventListener('keydown', function (e) {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				open(i);
			}
		});
	});

	if (btnClose) btnClose.addEventListener('click', close);
	if (btnPrev) btnPrev.addEventListener('click', function () { render(index - 1); });
	if (btnNext) btnNext.addEventListener('click', function () { render(index + 1); });

	viewer.addEventListener('click', function (e) {
		if (e.target === viewer) close();
	});

	document.addEventListener('keydown', function (e) {
		if (viewer.hidden) return;
		if (e.key === 'Escape') close();
		else if (e.key === 'ArrowLeft') render(index - 1);
		else if (e.key === 'ArrowRight') render(index + 1);
	});

	// 触摸滑动
	var startX = 0;
	var startY = 0;
	viewer.addEventListener('touchstart', function (e) {
		var t = e.changedTouches[0];
		startX = t.clientX;
		startY = t.clientY;
	}, { passive: true });

	viewer.addEventListener('touchend', function (e) {
		var t = e.changedTouches[0];
		var dx = t.clientX - startX;
		var dy = t.clientY - startY;
		if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
			render(index + (dx < 0 ? 1 : -1));
		}
	}, { passive: true });
})();
