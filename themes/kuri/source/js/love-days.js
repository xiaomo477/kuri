/* 爱心小屋 · 在一起的第 N 天（起始日当天算第 1 天） */
(function () {
	'use strict';

	/* 'YYYY-MM-DD' 或 'YYYY-MM-DD HH:mm(:ss)' → Date，缺时间按 00:00:00 */
	function parseStart(raw) {
		var m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/.exec(String(raw || '').trim());
		if (!m) return null;
		return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
	}

	function fillDays(box) {
		var numEl = box.querySelector('[data-love-days-num]');
		var start = parseStart(box.getAttribute('data-since'));
		if (!numEl || !start) return;

		var now = new Date();
		var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		var from = new Date(start.getFullYear(), start.getMonth(), start.getDate());
		var days = Math.round((today - from) / 86400000) + 1;
		if (!isFinite(days) || days < 1) days = 1;

		numEl.textContent = String(days);
	}

	function run() {
		var boxes = document.querySelectorAll('[data-love-days]');
		for (var i = 0; i < boxes.length; i++) fillDays(boxes[i]);
	}

	run();
	/* 跨零点后自动进位：每分钟校准一次 */
	window.setInterval(run, 60000);
})();
