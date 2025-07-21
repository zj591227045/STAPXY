#!/bin/bash

# 测试构建脚本
echo "🔧 开始测试构建..."

# 测试 TypeScript 编译
echo "📝 测试 TypeScript 编译..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
    echo "❌ TypeScript 编译失败"
    exit 1
fi
echo "✅ TypeScript 编译成功"

# 测试 Next.js 构建
echo "🏗️ 测试 Next.js 构建..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Next.js 构建失败"
    exit 1
fi
echo "✅ Next.js 构建成功"

# 测试没有配置文件的构建
echo "📁 测试无配置文件构建..."
if [ -f "config/config.json" ]; then
    mv config/config.json config/config.json.temp
fi

npm run build
BUILD_RESULT=$?

if [ -f "config/config.json.temp" ]; then
    mv config/config.json.temp config/config.json
fi

if [ $BUILD_RESULT -ne 0 ]; then
    echo "❌ 无配置文件构建失败"
    exit 1
fi
echo "✅ 无配置文件构建成功"

echo "🎉 所有测试通过！项目已准备好部署到 Vercel"
