#!/usr/bin/env node

/**
 * 测试代理功能的简单脚本
 */

const http = require('http');

async function testProxy() {
  console.log('🧪 开始测试代理功能...\n');

  // 测试 1: 访问代理地址
  console.log('📡 测试 1: 访问代理地址');
  try {
    const response = await makeRequest({
      hostname: 'site1.localhost',
      port: 3000,
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'Proxy-Test/1.0'
      }
    });

    console.log(`✅ 状态码: ${response.statusCode}`);
    console.log(`📄 内容长度: ${response.data.length} 字节`);
    console.log(`🔍 内容预览: ${response.data.substring(0, 100)}...`);
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 测试 2: 检查管理控制台状态
  console.log('📊 测试 2: 检查管理控制台状态');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/websocket',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({ action: 'status' }));

    const data = JSON.parse(response.data);
    console.log(`✅ 状态码: ${response.statusCode}`);
    console.log(`🔗 活跃连接: ${data.connections.active}`);
    console.log(`📋 注册站点: ${data.connections.sites.join(', ')}`);
    console.log(`📊 路由数量: ${data.routes.length}`);
    
    if (data.routes.length > 0) {
      console.log('📍 路由详情:');
      data.routes.forEach(route => {
        console.log(`   - ${route.siteId}: ${route.subdomain} -> ${route.targetUrl}`);
      });
    }
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
  }

  console.log('\n🎉 测试完成！');
}

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// 运行测试
testProxy().catch(console.error);
