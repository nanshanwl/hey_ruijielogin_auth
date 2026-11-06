#!/bin/sh
# ruijieauth 安装脚本
set -e

RESET=0
[ "$1" = "--reset-config" ] && RESET=1

[ "$(id -u)" = "0" ] || { echo "请用 root 运行"; exit 1; }

HERE=$(cd "$(dirname "$0")" && pwd)
[ -d "$HERE/files" ] || { echo "找不到 files/ 目录, 请在解压后的目录里运行"; exit 1; }

echo "== 1/5 检查依赖 =="
if command -v curl >/dev/null 2>&1; then
	echo "  curl 已安装"
else
	echo "  缺少 curl, 正在安装 ..."
	opkg update >/dev/null 2>&1 || true
	opkg install curl >/dev/null 2>&1 || { echo "  curl 安装失败, 请手动 opkg install curl"; exit 1; }
fi
if command -v bc >/dev/null 2>&1; then
	echo "  bc 已安装 (RSA 学校可用)"
else
	echo "  bc 未安装 —— 只有需要 RSA 加密的学校才要: opkg install bc"
fi

echo "== 2/5 安装文件 =="
(cd "$HERE/files" && find . -type f) | while read -r f; do
	f="${f#./}"
	dst="/$f"
	mkdir -p "$(dirname "$dst")"
	cp "$HERE/files/$f" "$dst"
done
chmod 755 /usr/sbin/ruijieauth /etc/init.d/ruijieauth /etc/hotplug.d/iface/99-ruijieauth
echo "  已安装到 /usr/sbin/ruijieauth 等位置"

echo "== 3/5 配置 =="
if [ -f /etc/config/ruijieauth ] && [ "$RESET" = "0" ]; then
	cp /etc/config/ruijieauth /etc/config/ruijieauth.bak
	echo "  已备份旧配置到 /etc/config/ruijieauth.bak, 保留现有配置"
else
	cp "$HERE/files/etc/config/ruijieauth" /etc/config/ruijieauth
	echo "  已写入默认配置"
fi

echo "== 4/5 注册服务 =="
/etc/init.d/ruijieauth enable
/etc/init.d/rpcd restart 2>/dev/null || true
rm -rf /tmp/luci-indexcache /tmp/luci-modulecache
echo "  已设置开机自启"

echo "== 5/5 启动 =="
if [ -n "$(uci -q get ruijieauth.portal.login_url)" ] && [ -n "$(uci -q get ruijieauth.main.username)" ]; then
	/etc/init.d/ruijieauth restart
	echo "  配置已完整, 守护进程已启动"
else
	echo "  配置还不完整, 先不启动守护进程"
fi

cat <<'EOF'

--------------------------------------------------
安装完成。接下来:

  1) 如果当前还没认证 (能上内网, 上不了外网):
        ruijieauth detect --write
     自动识别 portal 并写入配置

  2) 写入账号密码:
        ruijieauth set-auth 学号 密码

  3) 验证一次:
        ruijieauth -v login

  4) 启动守护:
        /etc/init.d/ruijieauth start
        ruijieauth status

  LuCI: 服务 -> 锐捷认证

  识别失败时: 浏览器 DevTools 里对登录请求右键
  "Copy as cURL", 存成 /tmp/login.curl, 然后:
        ruijieauth import-curl /tmp/login.curl
--------------------------------------------------
EOF
