#!/usr/bin/env node

/**
 * Static Proxy Client 测试脚本
 * 
 * 用于测试客户端的各种功能和场景
 */

const SmartStaticProxyClient = require('./smart-client');
const StaticProxyClient = require('./client-polling');

// 测试配置
const TEST_CONFIG = {
  proxyUrl: process.env.PROXY_URL || 'http://localhost:3000',
  siteId: 'test-site-' + Date.now(),
  subdomain: 'test' + Date.now(),
  targetUrl: 'http://httpbin.org', // 使用httpbin作为测试目标
  accessKey: process.env.ACCESS_KEY || 'test-key',
  pollInterval: 500
};

class ClientTester {
  constructor() {
    this.tests = [];
    this.results = [];
  }

  // 添加测试用例
  addTest(name, testFn) {
    this.tests.push({ name, testFn });
  }

  // 运行所有测试
  async runTests() {
    console.log('开始运行客户端测试...\n');
    
    for (const test of this.tests) {
      console.log(`运行测试: ${test.name}`);
      
      try {
        const startTime = Date.now();
        await test.testFn();
        const duration = Date.now() - startTime;
        
        console.log(`✅ ${test.name} - 通过 (${duration}ms)\n`);
        this.results.push({ name: test.name, status: 'PASS', duration });
        
      } catch (error) {
        console.log(`❌ ${test.name} - 失败: ${error.message}\n`);
        this.results.push({ name: test.name, status: 'FAIL', error: error.message });
      }
    }
    
    this.printSummary();
  }

  // 打印测试摘要
  printSummary() {
    console.log('='.repeat(50));
    console.log('测试摘要');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    
    console.log(`总测试数: ${this.results.length}`);
    console.log(`通过: ${passed}`);
    console.log(`失败: ${failed}`);
    
    if (failed > 0) {
      console.log('\n失败的测试:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    }
    
    console.log('='.repeat(50));
  }
}

// 创建测试器
const tester = new ClientTester();

// 测试1: 服务器连接测试
tester.addTest('服务器连接测试', async () => {
  const client = new SmartStaticProxyClient(TEST_CONFIG);
  
  // 测试服务器检测
  const mode = await client.detectServerMode();
  
  if (!mode || !['websocket', 'polling'].includes(mode)) {
    throw new Error(`无效的服务器模式: ${mode}`);
  }
  
  console.log(`  检测到服务器模式: ${mode}`);
});

// 测试2: 轮询客户端基本功能
tester.addTest('轮询客户端基本功能', async () => {
  const client = new StaticProxyClient({
    ...TEST_CONFIG,
    siteId: TEST_CONFIG.siteId + '-polling'
  });
  
  try {
    // 启动客户端
    await client.start();
    console.log('  轮询客户端启动成功');
    
    // 等待一段时间确保注册成功
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 停止客户端
    await client.stop();
    console.log('  轮询客户端停止成功');
    
  } catch (error) {
    await client.stop();
    throw error;
  }
});

// 测试3: 智能客户端自动检测
tester.addTest('智能客户端自动检测', async () => {
  const client = new SmartStaticProxyClient({
    ...TEST_CONFIG,
    siteId: TEST_CONFIG.siteId + '-smart'
  });
  
  try {
    // 启动客户端
    await client.start();
    console.log('  智能客户端启动成功');
    
    const mode = client.getMode();
    console.log(`  使用模式: ${mode}`);
    
    const isConnected = client.isConnected();
    console.log(`  连接状态: ${isConnected ? '已连接' : '未连接'}`);
    
    if (!isConnected) {
      throw new Error('客户端未正确连接');
    }
    
    // 等待一段时间
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 停止客户端
    await client.stop();
    console.log('  智能客户端停止成功');
    
  } catch (error) {
    await client.stop();
    throw error;
  }
});

// 测试4: 错误处理测试
tester.addTest('错误处理测试', async () => {
  // 测试无效的代理URL
  const client = new SmartStaticProxyClient({
    ...TEST_CONFIG,
    proxyUrl: 'http://invalid-url-that-does-not-exist.com',
    siteId: TEST_CONFIG.siteId + '-error'
  });
  
  try {
    await client.start();
    throw new Error('应该抛出连接错误');
  } catch (error) {
    if (error.message.includes('应该抛出连接错误')) {
      throw error;
    }
    console.log(`  正确捕获错误: ${error.message}`);
  }
});

// 测试5: 配置验证测试
tester.addTest('配置验证测试', async () => {
  // 测试缺少必需参数
  try {
    const client = new SmartStaticProxyClient({
      proxyUrl: TEST_CONFIG.proxyUrl
      // 缺少其他必需参数
    });
    
    await client.start();
    throw new Error('应该抛出配置错误');
    
  } catch (error) {
    if (error.message.includes('应该抛出配置错误')) {
      throw error;
    }
    console.log(`  正确捕获配置错误: ${error.message}`);
  }
});

// 测试6: HTTP请求转发测试（如果可能）
tester.addTest('HTTP请求转发测试', async () => {
  // 创建一个简单的HTTP服务器作为目标
  const http = require('http');
  
  const testServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      method: req.method,
      url: req.url,
      headers: req.headers,
      timestamp: Date.now()
    }));
  });
  
  // 启动测试服务器
  await new Promise((resolve) => {
    testServer.listen(0, () => {
      const port = testServer.address().port;
      console.log(`  测试服务器启动在端口: ${port}`);
      resolve();
    });
  });
  
  try {
    const port = testServer.address().port;
    const client = new StaticProxyClient({
      ...TEST_CONFIG,
      targetUrl: `http://localhost:${port}`,
      siteId: TEST_CONFIG.siteId + '-forward'
    });
    
    // 这里只测试客户端能否正确处理请求转发逻辑
    // 实际的端到端测试需要完整的代理服务器环境
    
    const mockRequest = {
      id: 'test-request-' + Date.now(),
      method: 'GET',
      url: '/test',
      headers: { 'User-Agent': 'test-client' },
      timestamp: Date.now()
    };
    
    const response = await client.forwardRequest(mockRequest);
    
    if (!response || !response.status || !response.body) {
      throw new Error('请求转发返回无效响应');
    }
    
    console.log(`  请求转发成功，状态码: ${response.status}`);
    
  } finally {
    testServer.close();
  }
});

// 主函数
async function main() {
  console.log('Static Proxy Client 测试套件');
  console.log('配置:', JSON.stringify(TEST_CONFIG, null, 2));
  console.log('');
  
  try {
    await tester.runTests();
  } catch (error) {
    console.error('测试运行失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main().catch(error => {
    console.error('测试失败:', error.message);
    process.exit(1);
  });
}

module.exports = ClientTester;
