#!/bin/sh
# ruijieauth 卸载脚本
# 用法: sh uninstall.sh [--keep-config]

KEEP=0
[ "$1" = "--keep-config" ] && KEEP=1

[ "$(id -u)" = "0" ] || { echo "请用 root 运行"; exit 1; }

/etc/init.d/ruijieauth stop 2>/dev/null
/etc/init.d/ruijieauth disable 2>/dev/null

rm -f /usr/sbin/ruijieauth
rm -f /etc/init.d/ruijieauth
rm -f /etc/hotplug.d/iface/99-ruijieauth
rm -f /usr/share/luci/menu.d/luci-app-ruijieauth.json
rm -f /usr/share/rpcd/acl.d/luci-app-ruijieauth.json
rm -rf /www/luci-static/resources/view/ruijieauth

rm -f /var/run/ruijieauth.*
# 注意: /etc/ruijieauth.last 故意保留 —— 删掉会让"已登录多久"丢失,
# 下次重装后主动重连的计时会从头开始。
[ "$KEEP" = "1" ] || rm -f /etc/config/ruijieauth

/etc/init.d/rpcd restart 2>/dev/null || true
rm -rf /tmp/luci-indexcache /tmp/luci-modulecache

echo "已卸载。配置: $([ "$KEEP" = "1" ] && echo 保留 || echo 已删除)  (--keep-config 可保留)"
