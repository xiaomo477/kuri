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

	var stageImg = viewer.querySelector('.lp-viewer-img') || viewer.querySelector('img');
	var stageVideo = viewer.querySelector('.lp-viewer-video');
	var noteEl = viewer.querySelector('.lp-viewer-note');
	var capEl = viewer.querySelector('.lp-viewer-cap');
	// 相册可能分成多栏（时间 + 事件），按 data-index 取全局下标，不能靠 DOM 顺序
	var shots = [].slice.call(document.querySelectorAll('.lp-shot[data-index]'));
	var btnClose = viewer.querySelector('.lp-viewer-close');
	var btnPrev = viewer.querySelector('.lp-viewer-prev');
	var btnNext = viewer.querySelector('.lp-viewer-next');

	var index = 0;
	var lastFocus = null;
	var closeTimer = null;

	function resetStage() {
		if (stageVideo) {
			try { stageVideo.pause(); } catch (e) {}
			stageVideo.hidden = true;
			stageVideo.removeAttribute('src');
			stageVideo.load();
		}
		if (stageImg) {
			stageImg.hidden = false;
			stageImg.removeAttribute('src');
		}
	}

	function render(i) {
		index = (i + photos.length) % photos.length;
		var item = photos[index];
		var isVideo = item.type === 'video' && stageVideo;

		if (isVideo) {
			if (stageImg) {
				stageImg.hidden = true;
				stageImg.removeAttribute('src');
			}
			stageVideo.hidden = false;
			// 同一个视频直接续播，换视频才重新设 src
			if (stageVideo.getAttribute('src') !== item.src) {
				stageVideo.setAttribute('src', item.src);
			}
			var played = stageVideo.play();
			if (played && played.catch) played.catch(function () {});
		} else {
			if (stageVideo) {
				try { stageVideo.pause(); } catch (e) {}
				stageVideo.hidden = true;
				stageVideo.removeAttribute('src');
				stageVideo.load();
			}
			if (stageImg) {
				stageImg.hidden = false;
				stageImg.src = item.src;
				stageImg.alt = item.caption || '';
			}
		}
		// 没写图注就不留空行，免得大图下面悬着一条空白
		if (capEl) {
			capEl.textContent = item.caption || '';
			capEl.hidden = !item.caption;
		}
		if (noteEl) noteEl.hidden = true;
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
			resetStage();
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

	// HEVC 之类的编码浏览器解不了，别只留一块黑，直接说清楚
	if (stageVideo) {
		stageVideo.addEventListener('error', function () {
			if (noteEl && !stageVideo.hidden) noteEl.hidden = false;
		});
	}

	// 视频缩略图：元数据到手后跳一帧，强制画出画面；实在取不到就把 <video> 藏掉，
	// 露出浅色底 + 播放图标，不会变成一块黑
	[].slice.call(document.querySelectorAll('.lp-shot video')).forEach(function (v) {
		v.addEventListener('loadedmetadata', function () {
			if (v.currentTime > 0) return;
			try {
				v.currentTime = Math.min(0.15, (v.duration || 1) / 2);
			} catch (e) {}
		});
		v.addEventListener('error', function () {
			v.style.display = 'none';
		});
	});
})();
