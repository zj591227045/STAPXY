#!/usr/bin/env node

// 客户端访问控制管理工具
import fs from 'fs';
import path from 'path';
import { ClientAccessControl } from '../lib/access-control.js';

class AccessControlManager {
  constructor() {
    this.configDir = './config/';
  }

  // 列出所有配置文件
  listConfigs() {
    try {
      const files = fs.readdirSync(this.configDir)
        .filter(file => file.startsWith('access-control-') && file.endsWith('.json'));
      
      console.log('📋 访问控制配置文件:');
      files.forEach(file => {
        const siteId = file.replace('access-control-', '').replace('.json', '');
        console.log(`   ${siteId}: ${file}`);
      });
      
      return files;
    } catch (error) {
      console.error('❌ 列出配置文件失败:', error.message);
      return [];
    }
  }

  // 创建新的配置文件
  createConfig(siteId, template = 'default') {
    const configPath = `${this.configDir}access-control-${siteId}.json`;
    
    if (fs.existsSync(configPath)) {
      console.log(`⚠️ 配置文件已存在: ${configPath}`);
      return false;
    }

    const accessControl = new ClientAccessControl(configPath);
    console.log(`✅ 已创建配置文件: ${configPath}`);
    
    // 如果有模板，应用模板配置
    if (template !== 'default') {
      this.applyTemplate(siteId, template);
    }
    
    return true;
  }

  // 应用配置模板
  applyTemplate(siteId, templateName) {
    const templates = {
      'web-server': {
        enabled: true,
        rules: {
          ipWhitelist: [],
          ipBlacklist: [],
          rateLimit: {
            enabled: true,
            maxRequests: 200,
            windowMs: 60000
          },
          pathRules: [
            {
              pattern: "^/admin/",
              action: "deny",
              description: "保护管理界面"
            }
          ],
          headerRules: [
            {
              header: "user-agent",
              pattern: "bot|crawler|spider",
              action: "deny",
              description: "阻止爬虫"
            }
          ]
        }
      },
      'api-server': {
        enabled: true,
        rules: {
          rateLimit: {
            enabled: true,
            maxRequests: 1000,
            windowMs: 60000
          },
          headerRules: [
            {
              header: "authorization",
              pattern: "Bearer .+",
              action: "allow",
              description: "需要认证"
            }
          ]
        }
      },
      'development': {
        enabled: false,
        rules: {
          rateLimit: {
            enabled: false
          }
        },
        logging: {
          enabled: true,
          logLevel: "debug"
        }
      }
    };

    const template = templates[templateName];
    if (!template) {
      console.error(`❌ 未知模板: ${templateName}`);
      return false;
    }

    const configPath = `access-control-${siteId}.json`;
    const accessControl = new ClientAccessControl(configPath);
    accessControl.updateConfig(template);
    
    console.log(`✅ 已应用模板 "${templateName}" 到 ${siteId}`);
    return true;
  }

  // 查看配置
  viewConfig(siteId) {
    const configPath = `access-control-${siteId}.json`;
    
    if (!fs.existsSync(configPath)) {
      console.error(`❌ 配置文件不存在: ${configPath}`);
      return;
    }

    const accessControl = new ClientAccessControl(configPath);
    const config = accessControl.getConfig();
    
    console.log(`📄 站点 ${siteId} 的访问控制配置:`);
    console.log(JSON.stringify(config, null, 2));
  }

  // 测试配置
  testConfig(siteId, testRequest) {
    const configPath = `access-control-${siteId}.json`;
    
    if (!fs.existsSync(configPath)) {
      console.error(`❌ 配置文件不存在: ${configPath}`);
      return;
    }

    const accessControl = new ClientAccessControl(configPath);
    const result = accessControl.checkAccess(testRequest);
    
    console.log(`🧪 测试结果 (站点: ${siteId}):`);
    console.log(`   请求: ${testRequest.method} ${testRequest.url}`);
    console.log(`   客户端IP: ${testRequest.clientIP}`);
    console.log(`   结果: ${result.allowed ? '✅ 允许' : '❌ 拒绝'}`);
    
    if (!result.allowed) {
      console.log(`   原因: ${result.reason}`);
      console.log(`   状态码: ${result.statusCode}`);
    }
  }

  // 查看访问统计
  viewStats(siteId) {
    const configPath = `access-control-${siteId}.json`;
    
    if (!fs.existsSync(configPath)) {
      console.error(`❌ 配置文件不存在: ${configPath}`);
      return;
    }

    const accessControl = new ClientAccessControl(configPath);
    const stats = accessControl.getAccessStats();
    
    console.log(`📊 站点 ${siteId} 的访问统计:`);
    console.log(`   总请求数: ${stats.totalRequests}`);
    console.log(`   最近1小时请求数: ${stats.recentRequests}`);
    console.log(`   唯一IP数: ${stats.uniqueIPs}`);
    console.log(`   被阻止请求数: ${stats.blockedRequests}`);
    console.log(`   阻止率: ${(stats.blockRate * 100).toFixed(2)}%`);
  }

  // 查看日志
  viewLogs(siteId, lines = 50) {
    const configPath = `access-control-${siteId}.json`;
    
    if (!fs.existsSync(configPath)) {
      console.error(`❌ 配置文件不存在: ${configPath}`);
      return;
    }

    const accessControl = new ClientAccessControl(configPath);
    const config = accessControl.getConfig();
    const logFile = config.logging.logFile;
    
    if (!logFile || !fs.existsSync(logFile)) {
      console.log(`⚠️ 日志文件不存在: ${logFile}`);
      return;
    }

    try {
      const logContent = fs.readFileSync(logFile, 'utf-8');
      const logLines = logContent.trim().split('\n');
      const recentLines = logLines.slice(-lines);
      
      console.log(`📜 站点 ${siteId} 的最近 ${recentLines.length} 条日志:`);
      recentLines.forEach(line => {
        try {
          const logEntry = JSON.parse(line);
          const timestamp = new Date(logEntry.timestamp).toLocaleString();
          console.log(`   [${timestamp}] ${logEntry.clientIP} ${logEntry.method} ${logEntry.path}`);
        } catch {
          console.log(`   ${line}`);
        }
      });
    } catch (error) {
      console.error('❌ 读取日志文件失败:', error.message);
    }
  }

  // 启用/禁用访问控制
  toggleAccessControl(siteId, enabled) {
    const configPath = `access-control-${siteId}.json`;
    
    if (!fs.existsSync(configPath)) {
      console.error(`❌ 配置文件不存在: ${configPath}`);
      return;
    }

    const accessControl = new ClientAccessControl(configPath);
    accessControl.updateConfig({ enabled });
    
    console.log(`${enabled ? '✅ 已启用' : '❌ 已禁用'} 站点 ${siteId} 的访问控制`);
  }
}

// 命令行接口
async function main() {
  const manager = new AccessControlManager();
  const args = process.argv.slice(2);
  const command = args[0];
  const siteId = args[1];

  switch (command) {
    case 'list':
      manager.listConfigs();
      break;

    case 'create':
      if (!siteId) {
        console.error('❌ 请指定站点ID');
        process.exit(1);
      }
      const template = args[2] || 'default';
      manager.createConfig(siteId, template);
      break;

    case 'view':
      if (!siteId) {
        console.error('❌ 请指定站点ID');
        process.exit(1);
      }
      manager.viewConfig(siteId);
      break;

    case 'test':
      if (!siteId) {
        console.error('❌ 请指定站点ID');
        process.exit(1);
      }
      const testRequest = {
        clientIP: args[2] || '192.168.1.100',
        method: args[3] || 'GET',
        url: args[4] || '/',
        headers: {
          'user-agent': args[5] || 'Mozilla/5.0'
        }
      };
      manager.testConfig(siteId, testRequest);
      break;

    case 'stats':
      if (!siteId) {
        console.error('❌ 请指定站点ID');
        process.exit(1);
      }
      manager.viewStats(siteId);
      break;

    case 'logs':
      if (!siteId) {
        console.error('❌ 请指定站点ID');
        process.exit(1);
      }
      const lines = parseInt(args[2]) || 50;
      manager.viewLogs(siteId, lines);
      break;

    case 'enable':
      if (!siteId) {
        console.error('❌ 请指定站点ID');
        process.exit(1);
      }
      manager.toggleAccessControl(siteId, true);
      break;

    case 'disable':
      if (!siteId) {
        console.error('❌ 请指定站点ID');
        process.exit(1);
      }
      manager.toggleAccessControl(siteId, false);
      break;

    default:
      console.log('🛡️ 客户端访问控制管理工具');
      console.log('\n使用方法:');
      console.log('  node access-control-manager.js list                           # 列出所有配置');
      console.log('  node access-control-manager.js create <siteId> [template]     # 创建配置');
      console.log('  node access-control-manager.js view <siteId>                  # 查看配置');
      console.log('  node access-control-manager.js test <siteId> <ip> <method> <url> # 测试配置');
      console.log('  node access-control-manager.js stats <siteId>                 # 查看统计');
      console.log('  node access-control-manager.js logs <siteId> [lines]          # 查看日志');
      console.log('  node access-control-manager.js enable <siteId>                # 启用访问控制');
      console.log('  node access-control-manager.js disable <siteId>               # 禁用访问控制');
      console.log('\n模板类型: default, web-server, api-server, development');
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { AccessControlManager };
