'require view';
'require form';
'require fs';
'require poll';
'require ui';

var CMD = '/usr/sbin/ruijieauth';

var CSS = `
.cn-wrap { padding-bottom: 2rem; }

.cn-hero {
	display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
	gap: 1rem; padding: 1rem 1.25rem; margin: 0 0 1rem 0;
	border-radius: .5rem; border: 1px solid #d8e6d8;
	background: linear-gradient(135deg, #f2fbf3 0%, #eaf6ec 100%);
}
.cn-hero.off { border-color: #f0d9d9; background: linear-gradient(135deg, #fdf3f3 0%, #fbeaea 100%); }
.cn-hero-main { display: flex; align-items: baseline; gap: .5rem; flex-wrap: wrap; }
.cn-dot { width: .7rem; height: .7rem; border-radius: 50%; background: #2bb673; display: inline-block; }
.cn-hero.off .cn-dot { background: #e05b5b; }
.cn-state { font-size: 1.6rem; font-weight: 700; color: #1d3b26; line-height: 1; }
.cn-hero.off .cn-state { color: #7a2020; }
.cn-sub { color: #5a6b60; font-size: .85rem; }

.cn-metrics { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.cn-metric { min-width: 6.5rem; }
.cn-metric label { display: block; color: #6b7d72; font-size: .75rem; letter-spacing: .02em; }
.cn-metric b { display: block; font-size: 1rem; color: #22372b; margin-top: .1rem; }
.cn-metric small { color: #7b8c81; font-size: .72rem; }

.cn-actions { display: flex; gap: .5rem; flex-wrap: wrap; margin: 0 0 1rem 0; }
.cn-btn {
	display: inline-flex; align-items: center; gap: .35rem;
	padding: .45rem 1rem; border-radius: .3rem; border: 0; cursor: pointer;
	font-size: .88rem; color: #fff; background: #5b7cfa; transition: filter .15s;
}
.cn-btn:hover { filter: brightness(1.08); }
.cn-btn:disabled { opacity: .55; cursor: default; }
.cn-btn.ghost { background: #8a9bb0; }
.cn-btn.warn { background: #e05b5b; }
.cn-btn.ok { background: #2bb673; }

.cn-card {
	background: #fff; border: 1px solid #e3e8ee; border-radius: .5rem;
	padding: 1rem 1.25rem; margin-bottom: 1rem;
}
.cn-card > h3, .cn-card-title {
	margin: 0 0 .25rem 0; font-size: 1rem; font-weight: 600; color: #26364a;
	background: none; padding: 0; display: block; width: auto; border-radius: 0;
}
.cn-card-desc { color: #7b8a9a; font-size: .8rem; margin: 0 0 .75rem 0; }

/* 中和 Argon 对 CBI 段/字段的卡片化处理 */
.cn-card fieldset.cbi-section, .cn-card .cbi-section,
.cn-card .cbi-section-node {
	background: none !important; border: 0 !important; box-shadow: none !important;
	padding: 0 !important; margin: 0 !important; border-radius: 0 !important;
}
.cn-card .cbi-section > legend, .cn-card .cbi-section-title,
.cn-card fieldset.cbi-section > h3, .cn-card .cbi-section > h3 { display: none !important; }
.cn-card .cbi-value { display: block !important; padding: .55rem 0 !important; border-bottom: 1px dashed #eef1f5; }
.cn-card .cbi-value:last-child { border-bottom: 0; }
.cn-card .cbi-value-title { display: block !important; width: auto !important; text-align: left !important; padding: 0 0 .3rem 0 !important; font-weight: 500; color: #33455c; }
.cn-card .cbi-value-field { display: block !important; width: auto !important; }
.cn-card .cbi-value-field input[type=text], .cn-card .cbi-value-field input[type=password],
.cn-card .cbi-value-field select { width: 100% !important; max-width: 420px !important; }
.cn-card .cbi-value-description { color: #8593a3; font-size: .78rem; margin-top: .25rem; }
.cn-card .cbi-button-apply, .cn-card .cbi-button-save { margin-top: .75rem; }

.cn-adv summary { cursor: pointer; font-weight: 600; color: #26364a; outline: none; }
.cn-adv[open] summary { margin-bottom: .75rem; }
.cn-adv .cn-btn { margin-top: .5rem; }
.cn-save { margin-top: .9rem; display: flex; gap: .5rem; align-items: center; }
.cn-save .hint { color: #8593a3; font-size: .78rem; }

.cn-log { max-height: 340px; overflow: auto; font-size: .78rem; }
.cn-log-row { display: grid; grid-template-columns: 62px minmax(0, 1fr); gap: .4rem; padding: .15rem 0; border-bottom: 1px solid #f4f6f8; }
.cn-log-time { color: #93a1b1; font-variant-numeric: tabular-nums; }
.cn-log-msg { min-width: 0; overflow-wrap: anywhere; color: #33455c; }
.cn-log-msg.err { color: #c0392b; }
.cn-log-msg.ok { color: #1e8e5a; }
.cn-empty { color: #93a1b1; font-size: .82rem; }

.cn-input { width: 100%; max-width: 420px; padding: .4rem .5rem; border: 1px solid #d5dde7; border-radius: .25rem; font-size: .85rem; }
.cn-wide { width: 100% !important; max-width: none !important; }
.cn-field textarea.cn-wide { min-height: 4.5rem; font-family: monospace; font-size: .76rem; word-break: break-all; }
.cn-row { margin-bottom: .6rem; }
.cn-row label { display: block; color: #6b7a8b; font-size: .78rem; margin-bottom: .2rem; }
`;

function bandH(hdr) {
	if (!hdr) return 0;
	var cs = window.getComputedStyle(hdr, '::after');
	if (!cs) return 0;
	if (cs.content === 'none' || cs.content === 'normal') return 0;
	if (cs.position !== 'absolute' && cs.position !== 'fixed') return 0;
	var h = parseFloat(cs.height) || 0;
	return (h > 0 && h < 200) ? h : 0;
}

function fmtTime(epoch) {
	if (!epoch || epoch <= 0) return '—';
	var d = new Date(epoch * 1000);
	function p(n) { return (n < 10 ? '0' : '') + n; }
	return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function nextWindow(epoch, win) {
	if (!epoch || !win) return epoch;
	var m = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(win);
	if (!m) return epoch;
	var d = new Date(epoch * 1000);
	var start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
	if (start.getTime() <= d.getTime()) start.setDate(start.getDate() + 1);
	return Math.floor(start.getTime() / 1000);
}

function fmtDur(sec) {
	sec = Math.max(0, sec | 0);
	var d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
	if (d > 0) return d + ' 天 ' + h + ' 小时';
	if (h > 0) return h + ' 小时 ' + m + ' 分';
	return m + ' 分';
}

function logClass(msg) {
	if (/失败|错误|警告|异常|未生效|fail|error|denied/i.test(msg)) return 'err';
	if (/成功|在线|启动|已发送注销/.test(msg)) return 'ok';
	return '';
}

function parseKV(text) {
	var out = {};
	(text || '').split('\n').forEach(function(line) {
		var i = line.indexOf('=');
		if (i > 0) out[line.substring(0, i)] = line.substring(i + 1);
	});
	return out;
}

function notify(msg, kind) {
	ui.addNotification(null, E('p', {}, msg), kind || 'info');
}

return view.extend({
	load: function() {
		var self = this;
		return Promise.all([
			fs.exec(CMD, ['status', '-j']).then(function(r) { return r.stdout || ''; }, function() { return ''; }),
			fs.exec(CMD, ['log', '80']).then(function(r) { return r.stdout || ''; }, function() { return ''; })
		]).then(function(res) {
			self._st = parseKV(res[0]);
			self._log = res[1];
			return self._st;
		});
	},

	render: function() {
		var self = this;
		var st = this._st || {};

		var style = document.getElementById('ruijieauth-style');
		if (!style) {
			style = document.createElement('style');
			style.id = 'ruijieauth-style';
			style.textContent = CSS;
			document.head.appendChild(style);
		}

		this.hero = E('div', { 'class': 'cn-hero' }, [
			E('div', { 'class': 'cn-hero-main' }, [
				E('span', { 'class': 'cn-dot' }),
				E('span', { 'class': 'cn-state', 'id': 'cn-state' }, '—'),
				E('span', { 'class': 'cn-sub', 'id': 'cn-sub' }, '')
			]),
			E('div', { 'class': 'cn-metrics' }, [
				E('div', { 'class': 'cn-metric' }, [
					E('label', {}, '守护进程'),
					E('b', { 'id': 'cn-daemon' }, '—'),
					E('small', { 'id': 'cn-daemon-sub' }, '')
				]),
				E('div', { 'class': 'cn-metric' }, [
					E('label', {}, '上次认证'),
					E('b', { 'id': 'cn-last' }, '—'),
					E('small', { 'id': 'cn-last-sub' }, '')
				]),
				E('div', { 'class': 'cn-metric' }, [
					E('label', {}, '计划重连'),
					E('b', { 'id': 'cn-next' }, '—'),
					E('small', { 'id': 'cn-next-sub' }, '')
				])
			])
		]);

		this.actions = E('div', { 'class': 'cn-actions' });

		var map = new form.Map('ruijieauth');
		var sec = map.section(form.TypedSection, 'ruijieauth');
		sec.anonymous = true;

		var o;
		o = sec.option(form.Flag, 'enabled', '启用');
		o.default = '1';
		o.rmempty = false;
		o.description = '关闭后既不自动登录, 也不主动重连';

		o = sec.option(form.Value, 'username', '账号');
		o.placeholder = '学号 / 手机号';
		o.rmempty = false;

		o = sec.option(form.Value, 'password', '密码');
		o.password = true;
		o.placeholder = '留空表示不修改';
		o.cfgvalue = function() { return ''; };
		o.write = function(section_id, value) {
			if (value == null || value === '') return Promise.resolve();
			return this.super('write', [section_id, value]);
		};
		o.description = '保存在 /etc/config/ruijieauth, 只有 root 可读';

		o = sec.option(form.ListValue, 'reauth_days', '重连周期');
		['4', '5', '6', '7'].forEach(function(d) {
			o.value(d, d + ' 天');
		});
		o.default = '6';
		o.description = '距上次认证满这么多天, 就在窗口内主动换一次会话';

		o = sec.option(form.Value, 'reauth_window', '时间窗口');
		o.placeholder = '04:00-05:00';
		o.default = '04:00-05:00';
		o.description = '只在这个时间段内做主动重连 (24 小时制)';

		var pmap = new form.Map('ruijieauth');
		var psec = pmap.section(form.TypedSection, 'portal');
		psec.anonymous = true;

		var po;
		po = psec.option(form.Value, 'login_url', '认证接口');
		po.placeholder = 'http://x.x.x.x/eportal/InterFace.do?method=login';
		po.rmempty = false;
		po.description = '由「自动识别」填写, 一般不用改';

		po = psec.option(form.Value, 'logout_url', '注销接口');
		po.placeholder = '...method=logout&userIndex=@USERINDEX@';
		po.description = '@USERINDEX@ 是运行时占位符';

		po = psec.option(form.Value, 'query_string', 'queryString');
		po.placeholder = 'wlanuserip=...';
		po.description = '与 WAN 的 IP/MAC 绑定; 换网或报"设备未注册"时重新识别一次';

		po = psec.option(form.ListValue, 'password_encrypt', '密码加密');
		po.value('auto', '自动 (推荐)');
		po.value('none', '明文');
		po.value('rsa', 'RSA');
		po.default = 'auto';
		po.description = '选 RSA 需要先 opkg install bc';

		po = psec.option(form.Value, 'service', 'service');
		po.placeholder = '留空表示不填';

		this.logCard = E('div', { 'class': 'cn-card' }, [
			E('h3', {}, '最近日志'),
			E('div', { 'class': 'cn-log', 'id': 'cn-log' })
		]);

		var advBody = E('div', {}, []);

		var logBtn = E('button', {
			'class': 'cn-btn ghost',
			click: function(ev) {
				ev.preventDefault();
				self.runCmd('正在识别 portal ...', [CMD, 'detect', '--write'], true);
			}
		}, '自动识别并填入');

		var det = E('details', { 'class': 'cn-card cn-adv' }, [
			E('summary', {}, '高级参数（一般不用改）'),
			E('p', { 'class': 'cn-card-desc' },
				'认证地址与 queryString 都是和 WAN 的 IP/MAC 绑定的。换网、换了 IP, 或登录后提示"设备未注册"时, ' +
				'点下面的按钮重新识别一次即可 (需要处于未认证状态)。'),
			logBtn,
			advBody
		]);

		return Promise.all([map.render(), pmap.render()]).then(function(nodes) {
			self.fill(st);
			self.fillLog(self._log);

			var root = E('div', { 'class': 'cn-wrap' }, [
				self.hero,
				self.actions,
				E('div', { 'class': 'cn-card' }, [
					E('h3', {}, '账号与重连'),
					nodes[0],
					E('div', { 'class': 'cn-save' }, [
						E('button', {
							'class': 'cn-btn ok',
							click: function(ev) { ev.preventDefault(); self.saveAll(); }
						}, '保存设置'),
						E('span', { 'class': 'hint' }, '改完账号/周期后点这里')
					])
				]),
				det,
				self.logCard
			]);

			self.map = map;
			self.pmap = pmap;

			advBody.appendChild(nodes[1]);

			self.fitTop(root);
			window.addEventListener('resize', function() { self.fitTop(root); });

			poll.add(function() { return self.refresh(); }, 20);

			return root;
		});
	},

	bandH: bandH,

	fitTop: function(page) {
		var self = this;
		var apply = function() {
			var hdr = document.querySelector('header');
			if (!hdr) return;
			var pad = Math.max(0, hdr.getBoundingClientRect().bottom - page.getBoundingClientRect().top) + bandH(hdr);
			page.style.paddingTop = pad > 0 ? pad + 'px' : '';
		};
		apply();
		[150, 600].forEach(function(ms) {
			setTimeout(apply, ms);
		});
	},

	fill: function(st) {
		var online = st.online === '1';
		this.hero.className = 'cn-hero' + (online ? '' : ' off');
		this.hero.querySelector('#cn-state').textContent = online ? '在线' : '离线';

		var sub = [];
		if (st.wan_ip) sub.push(st.wan_ip);
		if (st.wan_dev) sub.push(st.wan_dev);
		if (st.wan_mac) sub.push(st.wan_mac);
		this.hero.querySelector('#cn-sub').textContent = sub.join(' · ');

		var daemon = st.daemon === '1';
		this.hero.querySelector('#cn-daemon').textContent = daemon ? '运行中' : '已停止';
		this.hero.querySelector('#cn-daemon-sub').textContent =
			daemon ? '每 ' + (st.interval || '60') + ' 秒探测' : '掉线后不会自动重连';

		var last = parseInt(st.last_auth || '0', 10);
		var now = parseInt(st.now || '0', 10) || Math.floor(Date.now() / 1000);
		if (last > 0) {
			this.hero.querySelector('#cn-last').textContent = fmtTime(last);
			this.hero.querySelector('#cn-last-sub').textContent = '已持续 ' + fmtDur(now - last);
		} else {
			this.hero.querySelector('#cn-last').textContent = '—';
			this.hero.querySelector('#cn-last-sub').textContent = online ? '未知，守护启动后会补记' : '尚未认证';
		}

		var days = parseInt(st.reauth_days || '6', 10);
		var next = last > 0 ? nextWindow(last + days * 86400, st.reauth_window) : 0;
		if (next > 0) {
			this.hero.querySelector('#cn-next').textContent = fmtTime(next);
			this.hero.querySelector('#cn-next-sub').textContent =
				'还剩 ' + fmtDur(next - now) + ' (每 ' + days + ' 天, 窗口 ' + (st.reauth_window || '') + ')';
		} else {
			this.hero.querySelector('#cn-next').textContent = '—';
			this.hero.querySelector('#cn-next-sub').textContent = '需先成功登录一次';
		}

		this.fillActions(daemon);
	},

	fillActions: function(daemon) {
		var self = this;
		var mk = function(label, cls, fn) {
			return E('button', { 'class': 'cn-btn ' + (cls || ''), click: function(ev) { ev.preventDefault(); fn(); } }, label);
		};
		var kids = [
			mk('立即重连', '', function() { self.runCmd('正在重连 ...', [CMD, 'reauth']); }),
			mk('重新登录', '', function() { self.runCmd('正在登录 ...', [CMD, 'login']); }),
			mk('下线', 'warn', function() { self.runCmd('正在退出认证 ...', [CMD, 'logout']); })
		];
		if (daemon) {
			kids.push(mk('重启守护', 'ghost', function() { self.initCmd('restart'); }));
			kids.push(mk('停止守护', 'warn', function() { self.initCmd('stop'); }));
		} else {
			kids.push(mk('启动守护', 'ok', function() { self.initCmd('start'); }));
		}
		this.actions.innerHTML = '';
		kids.forEach(function(k) { self.actions.appendChild(k); });
	},

	fillLog: function(text) {
		var box = this.logCard.querySelector('#cn-log');
		box.innerHTML = '';
		if (!text || !text.trim()) {
			box.appendChild(E('div', { 'class': 'cn-empty' }, '还没有日志。守护进程启动后会在这里留下记录。'));
			return;
		}
		var re = /^\S+\s+\S+\s+\d+\s+(\d{2}:\d{2}:\d{2})\s+\d{4}\s+\S+\s+ruijieauth:\s?(.*)$/;
		var self = this;
		text.split('\n').forEach(function(line) {
			if (!line.trim()) return;
			var m = re.exec(line);
			var time = m ? m[1] : '';
			var msg = m ? m[2] : line;
			box.appendChild(E('div', { 'class': 'cn-log-row' }, [
				E('span', { 'class': 'cn-log-time' }, time),
				E('span', { 'class': 'cn-log-msg ' + logClass(msg) }, msg)
			]));
		});
		var rows = box.querySelectorAll('.cn-log-row');
		if (rows.length) box.scrollTop = box.scrollHeight;
	},

	refresh: function() {
		var self = this;
		return Promise.all([
			fs.exec(CMD, ['status', '-j']),
			fs.exec(CMD, ['log', '80'])
		]).then(function(res) {
			self.fill(parseKV((res[0] && res[0].stdout) || ''));
			self.fillLog((res[1] && res[1].stdout) || '');
		}).catch(function() {});
	},

	runCmd: function(title, argv, reload) {
		var self = this;
		notify(title);
		return fs.exec(argv[0], argv.slice(1)).then(function(res) {
			var out = ((res.stdout || '') + '\n' + (res.stderr || '')).trim();
			notify(out || '完成', res.code === 0 ? 'info' : 'warning');
			if (reload) {
				setTimeout(function() { location.reload(); }, 1200);
			} else {
				self.refresh();
			}
		}).catch(function(e) {
			notify('执行失败: ' + e, 'danger');
		});
	},

	initCmd: function(action) {
		var self = this;
		return fs.exec('/etc/init.d/ruijieauth', [action]).then(function(res) {
			if (res.code === 0 || /not running|Not found/i.test((res.stderr || '') + (res.stdout || '')))
				notify('已' + (action === 'stop' ? '停止' : action === 'start' ? '启动' : '重启') + '守护进程');
			else
				notify(((res.stderr || res.stdout) || '执行失败').trim(), 'warning');
			setTimeout(function() { self.refresh(); }, 800);
		}).catch(function(e) {
			notify('执行失败: ' + e, 'danger');
		});
	},

	saveAll: function() {
		var self = this;
		notify('正在保存 ...');
		return this.map.save().then(function() {
			return self.pmap.save();
		}).then(function() {
			notify('设置已保存');
			return self.refresh();
		}).catch(function(e) {
			notify('保存失败: ' + (e && e.message ? e.message : e), 'danger');
		});
	},

	handleSaveApply: function() { return this.saveAll(); },
	handleSave: function() { return this.saveAll(); },
	handleReset: null
});
