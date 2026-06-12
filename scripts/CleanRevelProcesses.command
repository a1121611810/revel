#!/bin/bash
echo "========================================"
echo "  Revel 残留进程清理工具"
echo "========================================"
echo ""

# 查找残留进程
PROCS=$(ps aux | grep -E 'revel.*electron|electron.*revel' | grep -v grep)
COUNT=$(echo "$PROCS" | grep -c .)

if [ -z "$PROCS" ] || [ "$COUNT" -eq 0 ]; then
  echo "✅ 没有检测到 Revel/Electron 残留进程"
else
  echo "发现 $COUNT 个残留进程，正在清理..."
  echo "$PROCS" | awk '{print $2}' | xargs kill -9 2>/dev/null
  echo "✅ 已清理 $COUNT 个残留进程"
fi

# 释放端口
echo ""
PORT_PIDS=$(lsof -ti:5173 2>/dev/null)
if [ -n "$PORT_PIDS" ]; then
  echo "释放 5173 端口..."
  echo "$PORT_PIDS" | xargs kill -9 2>/dev/null
  echo "✅ 端口 5173 已释放"
else
  echo "✅ 端口 5173 未被占用"
fi

# 清理 Vite 缓存
echo ""
echo "清理 Vite 缓存..."
rm -rf node_modules/.vite 2>/dev/null
if [ $? -eq 0 ]; then
  echo "✅ Vite 缓存已清除"
else
  echo "⚠️ Vite 缓存清除失败（可能不存在）"
fi

echo ""
echo "========================================"
echo "  清理完成！可以重新启动 pnpm dev 了"
echo "========================================"
echo ""
echo "按回车键关闭窗口..."
read
