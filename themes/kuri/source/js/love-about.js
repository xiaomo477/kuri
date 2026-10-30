/* 爱心小屋 · 关于我们（对话流，替代 BotUI） */
(function () {
	'use strict';

	var dataEl = document.getElementById('lp-about-data');
	var chat = document.getElementById('lp-chat');
	var actions = document.getElementById('lp-actions');
	if (!dataEl || !chat || !actions) return;

	var data;
	try {
		data = JSON.parse(dataEl.textContent || '{}');
	} catch (err) {
		return;
	}

	var dialog = data.dialog || [];
	var buttons = data.buttons || [];
	var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function bubble(text, who) {
		var row = document.createElement('div');
		row.className = 'lp-msg ' + (who === 'human' ? 'is-human' : 'is-bot');
		var b = document.createElement('div');
		b.className = 'lp-bubble';
		b.textContent = text;
		if (reduce) b.style.opacity = '1';
		row.appendChild(b);
		chat.appendChild(row);
		chat.scrollTop = chat.scrollHeight;
		return row;
	}

	function showActions() {
		actions.innerHTML = '';
		buttons.forEach(function (item) {
			var btn = document.createElement('button');
			btn.type = 'button';
			btn.textContent = item.text;
			btn.addEventListener('click', function () {
				bubble(item.text, 'human');
				actions.innerHTML = '';

				var replies = [].concat(item.reply || []);
				replies.forEach(function (line, i) {
					setTimeout(function () {
						bubble(line, 'bot');
					}, reduce ? 0 : 480 * (i + 1));
				});

				if (item.next && item.next.length) {
					setTimeout(function () {
						buttons = item.next;
						showActions();
					}, reduce ? 0 : 480 * replies.length + 260);
				} else if (buttons.length && item.again !== false) {
					setTimeout(showActions, reduce ? 0 : 480 * replies.length + 900);
				}
			});
			actions.appendChild(btn);
		});
	}

	function play() {
		if (!dialog.length) {
			showActions();
			return;
		}
		var i = 0;
		(function step() {
			bubble(dialog[i], 'bot');
			i += 1;
			if (i < dialog.length) {
				setTimeout(step, reduce ? 0 : 900);
			} else {
				setTimeout(showActions, reduce ? 0 : 700);
			}
		})();
	}

	play();
})();
