# ruijieauth

**锐捷 ePortal 校园网自动认证 · 掉线自愈 · 定时换会话**

给 OpenWrt 软路由用的校园网自动登录工具。不是"心跳保活", 而是**主动重建认证会话** —— 赶在服务器踢人之前自己换一次, 让网络一直可用。

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/OpenWrt-21.02%2B-blue.svg)](https://openwrt.org)
[![LuCI](https://img.shields.io/badge/LuCI-JS%20view-orange.svg)](https://github.com/openwrt/luci)

---

## 为什么需要它

多数高校的校园网是"网页认证"模式:

- 认证服务器只认**会话**, 不认"设备一直在线"
- 会话有最长在线时长 (不少学校是 7×24 小时), 到点强制下线, 哪怕你一直在用
- 路由器不重启也没用, 因为踢的是服务器侧的会话

所以正确做法是**在到期前主动换一个新会话**, 而不是重启网络 —— 重启只会让 IP/MAC 变化, 认证参数全部失效, 断得更久。

`ruijieauth` 做两件事:

1. **看门狗**: 每 60 秒探测一次外网, 掉线立刻重登
2. **预判**: 距上次认证满 N 天 (默认 6), 在凌晨的时间窗口里 `logout → login` 换一次会话; 到期前后探测间隔降到 10 秒, 真被踢了几秒内也能回来

---

## 特性

- 🔁 **掉线自愈** — 60 秒探测, 断网后自动重登, 失败指数退避
- ⏰ **主动换会话** — 满 6 天 (可调) 在 04:00–05:00 窗口内 `logout → login`, 不依赖服务器踢人
- ⚡ **临期快探** — 到期前 10 分钟到到期后 30 分钟, 探测间隔降到 10 秒
- 🛡 **防锁号** — 连续失败 5 次自动暂停 1 小时, 避免把账号打出验证码
- 🔍 **自动识别 portal** — `detect` 抓未认证跳转, 从 Location 或响应体 `<script>` 里提取 `wlanuserip=...` 参数
- 📋 **cURL 导入兜底** — 识别不了的学校, 把浏览器"Copy as cURL"的登录请求喂进来, 自动拆出 URL / 方法 / 表单字段 / queryString / UA
- 🔐 **RSA 支持** — `password_encrypt=auto`: 先发明文, 失败自动改用 RSA (依赖 `bc`, 不需要 openssl)
- 🖥 **LuCI 界面** — 状态条、一键重连、账号与周期、高级参数、实时日志
- 🧩 **配置驱动** — 不写死任何学校的地址; `login_fields` 支持占位符, 换学校只改配置不改代码

> **只支持锐捷 ePortal** (`/eportal/InterFace.do?method=login`)。
> 深澜 srun、城市热点 Dr.COM、华为 Agile Controller 等是别的协议, 不适用。

---

## 界面

<!-- 把你的截图放到 docs/screenshot.png, 取消下面这行注释 -->
<!-- ![LuCI 界面](docs/screenshot.png) -->

顶部是在线状态与三个指标 (守护进程 / 上次认证 / 计划重连), 下面是操作按钮、账号设置、高级参数和日志。

---

## 安装

### 方式一: 下载发行包 (推荐)

到 [Releases](https://gitee.com/heycrr/hey_ruijielogin_auth/releases) 下载 `ruijieauth-x.y.z.tar.gz`, 传到路由器:

```sh
# Linux / macOS
scp ruijieauth-1.0.0.tar.gz root@192.168.1.1:/tmp/

# Windows (PuTTY)
pscp -scp ruijieauth-1.0.0.tar.gz root@192.168.1.1:/tmp/
```

```sh
cd /tmp
tar -xzf ruijieauth-1.0.0.tar.gz
cd ruijieauth
sh install.sh
```

### 方式二: 从仓库安装

```sh
git clone https://gitee.com/heycrr/hey_ruijielogin_auth.git /tmp/ruijieauth
cd /tmp/ruijieauth
sh install.sh
```

安装脚本会: 检查 `curl` → 复制文件 → 写默认配置 (已有配置备份成 `.bak`) → 设置开机自启 → 配置完整时直接启动。

---

## 配置步骤：

### 1. 识别 portal

**先让网络处于未认证状态** (能打开内网, 打不开外网), 然后:

```sh
ruijieauth detect --write
```

输出类似:

```
识别结果
  portal 地址 : http://10.9.9.1/eportal/index.jsp
  登录接口    : http://10.9.9.1/eportal/InterFace.do?method=login
  注销接口    : http://10.9.9.1/eportal/InterFace.do?method=logout&userIndex=@USERINDEX@
  queryString : 5d59aabae1883  (共 300 字符)
  密码加密    : 明文 (passwordEncrypt=false)
```

### 2. 写账号

```sh
ruijieauth set-auth 学号 密码
```

### 3. 验证并启动

```sh
ruijieauth -v login        # 看到 "认证成功" 即可
/etc/init.d/ruijieauth start
ruijieauth status
```

`-v` 会打印请求和响应, 失败时能直接看出 portal 说了什么。

> 也可以直接跑交互式向导: `ruijieauth setup`

---

## 自动识别失败怎么办

这是**常态**, 不是你的问题 —— 每个学校的 portal 长得都不一样。两个办法:

### A. 看它跳到哪里

浏览器打开任意 http 网站 (比如 `http://1.1.1.1`), 记下跳转后的完整地址:

```
http://10.9.9.1/eportal/index.jsp?wlanuserip=xxxx&wlanacname=yyy&...
```

把 `?` 后面整段贴进配置:

```sh
ruijieauth set-portal query_string 'wlanuserip=xxxx&wlanacname=yyy&...'
ruijieauth set-portal login_url   'http://10.9.9.1/eportal/InterFace.do?method=login'
ruijieauth set-portal logout_url  'http://10.9.9.1/eportal/InterFace.do?method=logout&userIndex=@USERINDEX@'
```

### B. 直接喂 cURL 

1. 浏览器打开认证页, F12 → Network
2. 手动登录一次, 找到 `login` 请求
3. 右键 → **Copy as cURL**
4. 粘贴到路由器上的文件:

```sh
cat > /tmp/login.curl
# 粘贴, Ctrl-D 结束
```

5. 导入:

```sh
ruijieauth import-curl /tmp/login.curl
ruijieauth set-auth 校园网账号 密码
```

导入时会自动把账号和密码字段替换成占位符, 所以抓包里是加密密码也没关系。

---

## 工作原理

```
        ┌──────────── 每 60s ────────────┐
        │  探测 generate_204 / https      │
        └───────────┬────────────────────┘
                    │
        在线 ───────┴───── 离线
         │                  │
         │                  └─► do_login() 重登
         │                       失败 → 退避 (60s×n, 上限 600s)
         │                       连续 5 次 → 暂停 1h
         │
         └─► 满 N 天？在窗口内？
                └─► logout → 确认掉线 → login
```

| 机制 | 默认值 | 作用 |
| --- | --- | --- |
| `check_interval` | 60s | 掉线探测间隔 |
| `reauth_days` | 6 | 距上次认证满这么多天主动换会话 |
| `reauth_window` | 04:00-05:00 | 只在这个窗口里换, 避免白天断网 |
| `expiry_days` / `fast_interval` | 7 / 10s | 临期快探, 被踢后几秒内重登 |
| `max_backoff` | 600s | 认证失败的最大退避 |

主动重连前会先 `logout`, 并等最多 8 秒确认**真的掉线**; 如果注销没生效就放弃, 免得把"用户已在线"误判成成功。

---

## 配置项

`/etc/config/ruijieauth`

### main

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `enabled` | 1 | 总开关 |
| `iface` | wan | 出口接口 |
| `username` / `password` | 空 | 用 `set-auth` 写 |
| `ua` | Chrome/124 | 请求 UA, 用 ua2f 时要与它一致 |
| `check_urls` | 小米 204 + 百度 | 在线判定 |
| `probe_urls` | 5 个 | 识别 portal 时依次尝试 |
| `check_interval` | 60 | 掉线探测间隔 (秒) |
| `reauth_enable` | 1 | 是否主动换会话 |
| `reauth_days` | 6 | 满 N 天换一次 |
| `reauth_window` | 04:00-05:00 | 换会话的时间窗口 |
| `max_backoff` | 600 | 失败退避上限 (秒) |
| `expiry_days` | 7 | 预估被踢周期 |
| `fast_interval` | 10 | 临期探测间隔 (秒) |

### portal

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `base` | 空 | portal 根地址, `detect` 自动填 |
| `pre_url` | 空 | 认证前 GET 一次, 拿 JSESSIONID 等 Cookie |
| `login_url` | 空 | 认证接口 |
| `login_method` | POST | `GET` / `POST` |
| `login_fields` | 见配置文件 | 表单模板 |
| `login_body` | 空 | 非表单原始 body (优先级低于 `login_fields`) |
| `logout_url` | 空 | 注销接口, 支持 `@USERINDEX@` |
| `query_string` | 空 | 加密的 IP/MAC 参数 |
| `referer` | 空 | 认证请求 Referer |
| `password_encrypt` | auto | `auto` / `none` / `rsa` |
| `service` | 空 | 部分学校要求填 SSID |
| `success_grep` | `"result":"success"` | 响应里出现即认为 portal 说成功 |

`login_fields` 支持的占位符:

| 占位符 | 替换成 |
| --- | --- |
| `@USERNAME@` | 账号 |
| `@PASSWORD@` | 密码 (按 `password_encrypt` 处理) |
| `@QUERYSTRING@` | queryString |
| `@SERVICE@` | `portal.service` |
| `@UA@` | 请求 UA |

`passwordEncrypt` 字段不用手填, 程序会按加密方式自动写 `true` / `false`。

---

## 常见问题

<details>
<summary><b>登录成功但马上又掉线</b></summary>

多半是 IP/MAC 和 queryString 对不上。重跑 `ruijieauth detect --write`; 如果 WAN 是动态 IP, 每次换 IP 都要重跑一次。
</details>

<details>
<summary><b>响应里出现「设备未注册, 请在 ePortal 上添加认证设备」</b></summary>

同上, queryString 过期或与当前 WAN 不匹配。另外确认路由器是直接 PPPoE/DHCP 拿的地址, 不是经过了二级 NAT。
</details>

<details>
<summary><b>出现「验证码」/ validcode</b></summary>

说明账号已经被 portal 标记 (通常是密码错太多次)。程序会暂停 1 小时, 期间请在浏览器里手动登录一次, 再恢复自动。
</details>

<details>
<summary><b>学校用 RSA 加密密码</b></summary>

`detect` 会显示「密码加密: RSA」。此时需要 `opkg install bc`, 并把 `portal.password_encrypt` 设成 `rsa`。`auto` 模式会先发明文, 失败再自动换 RSA。
</details>


<details>
<summary><b>能不能只保活, 不主动重连</b></summary>

`main.reauth_enable=0` 即可。但那样只能等被踢之后再重登, 断网窗口取决于探测间隔。
</details>

<details>
<summary><b>断电 / 重装后「上次认证」没了</b></summary>

`/etc/ruijieauth.last` 保存上次成功认证的时间。卸载脚本默认保留它; 如果手动删了, 守护进程启动时会按当前时间补记一条, 不影响使用。
</details>

---

## 诊断

```sh
ruijieauth doctor        # 依赖 / 配置 / 网络自检
ruijieauth probe         # 接口、路由、DNS、连通性、跳转
ruijieauth status        # 一句话状态
ruijieauth status -j     # key=value, 给脚本用
ruijieauth log 100       # 最近 100 行日志
logread -f -e ruijieauth # 实时跟踪
```

连接问题先看 `probe`, 认证问题先看 `login -v`。

---

## 文件结构

```
/etc/config/ruijieauth                             配置
/usr/sbin/ruijieauth                               主程序 (POSIX sh)
/etc/init.d/ruijieauth                             procd 服务
/etc/hotplug.d/iface/99-ruijieauth                 WAN up 后自动认证
/usr/share/luci/menu.d/luci-app-ruijieauth.json    LuCI 菜单
/usr/share/rpcd/acl.d/luci-app-ruijieauth.json     LuCI 权限
/www/luci-static/resources/view/ruijieauth/main.js LuCI 页面
/etc/ruijieauth.last                               上次认证时间 (卸载时保留)
```

---

## 卸载

```sh
cd /tmp/ruijieauth
sh uninstall.sh                 # 连配置一起删
sh uninstall.sh --keep-config   # 保留配置
```

---

## 兼容性

- OpenWrt **21.02 及以上** (在 23.05 + Argon 主题实测)
- 需要 `curl`; RSA 学校需要 `bc`
- LuCI 为 JS 版页面, 不依赖 `luci-compat`
- 架构无关 (纯 shell)

---

## 免责声明

本项目只做一件事: **用你自己的账号, 让已经登录的会话不要过期**。

它不是破解工具, 不能绕过计费、不能共享账号、不能伪造他人身份。使用前请确认学校的使用条款允许保留长期会话; 因使用本工具导致的账号封禁、计费争议等后果由使用者自行承担。

---

## License

[MIT](LICENSE)
