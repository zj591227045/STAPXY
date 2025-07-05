#!/usr/bin/env node

/**
 * 配置文件验证脚本
 * 验证 config/config.json 文件的语法和结构
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config/config.json');

function validateConfig() {
  console.log('🔍 验证配置文件...');
  
  try {
    // 检查文件是否存在
    if (!fs.existsSync(CONFIG_PATH)) {
      console.error('❌ 配置文件不存在:', CONFIG_PATH);
      process.exit(1);
    }
    
    // 读取并解析配置文件
    const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
    const config = JSON.parse(configData);
    
    console.log('✅ JSON 语法正确');
    
    // 验证必需字段
    const requiredFields = {
      'admin.password': config.admin?.password,
      'admin.sessionTimeout': config.admin?.sessionTimeout,
      'auth.mode': config.auth?.mode,
      'proxy.maxConnections': config.proxy?.maxConnections
    };
    
    let hasErrors = false;
    
    for (const [field, value] of Object.entries(requiredFields)) {
      if (value === undefined || value === null) {
        console.error(`❌ 缺少必需字段: ${field}`);
        hasErrors = true;
      } else {
        console.log(`✅ ${field}: ${typeof value === 'string' && field.includes('password') ? '***' : value}`);
      }
    }
    
    // 验证认证模式
    if (config.auth?.mode && !['single', 'multi'].includes(config.auth.mode)) {
      console.error('❌ auth.mode 必须是 "single" 或 "multi"');
      hasErrors = true;
    }
    
    // 验证单密钥模式配置
    if (config.auth?.mode === 'single') {
      if (!config.auth.singleKey?.key) {
        console.error('❌ 单密钥模式下缺少 auth.singleKey.key');
        hasErrors = true;
      } else {
        console.log('✅ 单密钥配置正确');
      }
    }
    
    // 验证多密钥模式配置
    if (config.auth?.mode === 'multi') {
      if (!Array.isArray(config.auth.multiKeys?.domainMappings)) {
        console.error('❌ 多密钥模式下缺少 auth.multiKeys.domainMappings 数组');
        hasErrors = true;
      } else {
        console.log(`✅ 多密钥配置: ${config.auth.multiKeys.domainMappings.length} 个域名映射`);
      }
    }
    
    // 验证管理域名配置
    if (config.admin?.domain) {
      console.log(`✅ 管理域名: ${config.admin.domain}`);
    } else {
      console.log('⚠️  未配置管理域名，将使用默认值');
    }
    
    if (hasErrors) {
      console.error('\n❌ 配置验证失败，请修复上述错误');
      process.exit(1);
    } else {
      console.log('\n🎉 配置验证通过！');
      console.log('\n📋 配置摘要:');
      console.log(`   认证模式: ${config.auth.mode}`);
      console.log(`   管理域名: ${config.admin.domain || 'admin.localhost (默认)'}`);
      console.log(`   最大连接数: ${config.proxy.maxConnections}`);
      console.log(`   会话超时: ${Math.floor(config.admin.sessionTimeout / 1000 / 60)} 分钟`);
    }
    
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('❌ JSON 语法错误:', error.message);
    } else {
      console.error('❌ 验证失败:', error.message);
    }
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  validateConfig();
}

module.exports = { validateConfig };
