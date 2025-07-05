#!/bin/bash

# 测试环境设置脚本

echo "🚀 设置静态代理测试环境..."

# 检查Node.js版本
echo "📋 检查Node.js版本..."
node_version=$(node -v 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Node.js版本: $node_version"
else
    echo "❌ 未安装Node.js，请先安装Node.js 18或更高版本"
    exit 1
fi

# 安装主项目依赖
echo "📦 安装主项目依赖..."
npm install

# 安装客户端依赖
echo "📦 安装客户端依赖..."
cd client
npm install
cd ..

# 创建测试站点目录
echo "🏗️ 创建测试站点..."
mkdir -p test-sites/site1
mkdir -p test-sites/site2
mkdir -p test-sites/site3

# 创建测试站点1
cat > test-sites/site1/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>测试站点1</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f0f8ff; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2563eb; }
        .info { background: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌟 测试站点1</h1>
        <div class="info">
            <p><strong>站点ID:</strong> site1</p>
            <p><strong>端口:</strong> 3001</p>
            <p><strong>状态:</strong> 运行中</p>
            <p><strong>时间:</strong> <span id="time"></span></p>
        </div>
        <p>这是一个测试站点，用于验证静态代理系统的功能。</p>
        <p>如果您能看到这个页面，说明代理转发工作正常！</p>
    </div>
    <script>
        function updateTime() {
            document.getElementById('time').textContent = new Date().toLocaleString('zh-CN');
        }
        updateTime();
        setInterval(updateTime, 1000);
    </script>
</body>
</html>
EOF

# 创建测试站点2
cat > test-sites/site2/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>测试站点2</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f0fff0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #16a34a; }
        .info { background: #f0fdf4; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 测试站点2</h1>
        <div class="info">
            <p><strong>站点ID:</strong> site2</p>
            <p><strong>端口:</strong> 3002</p>
            <p><strong>状态:</strong> 运行中</p>
            <p><strong>时间:</strong> <span id="time"></span></p>
        </div>
        <p>这是第二个测试站点，用于验证多站点代理功能。</p>
        <p>每个站点都有独立的样式和内容！</p>
    </div>
    <script>
        function updateTime() {
            document.getElementById('time').textContent = new Date().toLocaleString('zh-CN');
        }
        updateTime();
        setInterval(updateTime, 1000);
    </script>
</body>
</html>
EOF

# 创建测试站点3
cat > test-sites/site3/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>测试站点3</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #fefce8; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #ca8a04; }
        .info { background: #fffbeb; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>⭐ 测试站点3</h1>
        <div class="info">
            <p><strong>站点ID:</strong> site3</p>
            <p><strong>端口:</strong> 3003</p>
            <p><strong>状态:</strong> 运行中</p>
            <p><strong>时间:</strong> <span id="time"></span></p>
        </div>
        <p>这是第三个测试站点，展示系统的扩展能力。</p>
        <p>您可以添加更多站点来测试系统的承载能力！</p>
    </div>
    <script>
        function updateTime() {
            document.getElementById('time').textContent = new Date().toLocaleString('zh-CN');
        }
        updateTime();
        setInterval(updateTime, 1000);
    </script>
</body>
</html>
EOF

# 创建启动脚本
cat > scripts/start-test-sites.sh << 'EOF'
#!/bin/bash

echo "🌐 启动测试站点..."

# 检查端口是否被占用
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️ 端口 $1 已被占用"
        return 1
    fi
    return 0
}

# 启动站点1
if check_port 3001; then
    echo "🚀 启动测试站点1 (端口3001)..."
    cd test-sites/site1
    python3 -m http.server 3001 > /dev/null 2>&1 &
    echo $! > ../../.site1.pid
    cd ../..
    echo "✅ 站点1已启动: http://localhost:3001"
fi

# 启动站点2
if check_port 3002; then
    echo "🚀 启动测试站点2 (端口3002)..."
    cd test-sites/site2
    python3 -m http.server 3002 > /dev/null 2>&1 &
    echo $! > ../../.site2.pid
    cd ../..
    echo "✅ 站点2已启动: http://localhost:3002"
fi

# 启动站点3
if check_port 3003; then
    echo "🚀 启动测试站点3 (端口3003)..."
    cd test-sites/site3
    python3 -m http.server 3003 > /dev/null 2>&1 &
    echo $! > ../../.site3.pid
    cd ../..
    echo "✅ 站点3已启动: http://localhost:3003"
fi

echo ""
echo "🎉 测试站点启动完成！"
echo "📋 访问地址:"
echo "   - 站点1: http://localhost:3001"
echo "   - 站点2: http://localhost:3002"
echo "   - 站点3: http://localhost:3003"
echo ""
echo "💡 使用 'npm run stop-test-sites' 停止所有测试站点"
EOF

# 创建停止脚本
cat > scripts/stop-test-sites.sh << 'EOF'
#!/bin/bash

echo "🛑 停止测试站点..."

# 停止站点1
if [ -f .site1.pid ]; then
    pid=$(cat .site1.pid)
    if kill -0 $pid 2>/dev/null; then
        kill $pid
        echo "✅ 站点1已停止"
    fi
    rm -f .site1.pid
fi

# 停止站点2
if [ -f .site2.pid ]; then
    pid=$(cat .site2.pid)
    if kill -0 $pid 2>/dev/null; then
        kill $pid
        echo "✅ 站点2已停止"
    fi
    rm -f .site2.pid
fi

# 停止站点3
if [ -f .site3.pid ]; then
    pid=$(cat .site3.pid)
    if kill -0 $pid 2>/dev/null; then
        kill $pid
        echo "✅ 站点3已停止"
    fi
    rm -f .site3.pid
fi

echo "🎉 所有测试站点已停止"
EOF

# 设置脚本执行权限
chmod +x scripts/start-test-sites.sh
chmod +x scripts/stop-test-sites.sh

echo ""
echo "✅ 测试环境设置完成！"
echo ""
echo "📋 下一步操作:"
echo "1. 启动测试站点: npm run start-test-sites"
echo "2. 启动代理服务器: npm run dev"
echo "3. 启动客户端: cd client && node examples/site1.js"
echo "4. 访问管理界面: http://localhost:3000"
echo "5. 测试代理访问: http://a1.localhost:3000"
