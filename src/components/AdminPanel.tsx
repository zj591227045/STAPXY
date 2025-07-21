'use client';

import { useState, useEffect } from 'react';

interface AccessKey {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAt: string;
}

interface ConnectionStats {
  total: number;
  active: number;
  sites: string[];
}

interface RouteStats {
  totalRoutes: number;
  routes: Array<{
    siteId: string;
    subdomain: string;
    targetUrl: string;
    createdAt?: number;
    lastActive?: number;
    description?: string;
  }>;
}

interface SystemStatus {
  connections: ConnectionStats;
  routes: Array<{
    siteId: string;
    subdomain: string;
    targetUrl: string;
    createdAt?: number;
    lastActive?: number;
    description?: string;
  }>;
  timestamp: number;
}

interface AuthConfig {
  mode: 'single' | 'multi';
  singleKey: {
    key: string;
    description: string;
  };
  multiKeys: {
    domainMappings: Array<{
      subdomain: string;
      accessKey: string;
      description: string;
    }>;
    fallbackKey: {
      key: string;
      description: string;
    };
  };
}

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [accessKeys, setAccessKeys] = useState<AccessKey[]>([]);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'keys'>('dashboard');
  const [isProduction] = useState(process.env.NODE_ENV === 'production');

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/websocket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'status' }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }

      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const fetchAccessKeys = async () => {
    try {
      const response = await fetch('/api/admin/keys');
      if (!response.ok) {
        if (response.status === 401) {
          console.log('需要登录才能获取访问密钥');
          return;
        }
        throw new Error('Failed to fetch access keys');
      }

      const data = await response.json();
      if (data.success) {
        setAccessKeys(data.data);
      }
    } catch (err) {
      console.error('获取访问密钥失败:', err);
    }
  };

  const fetchAuthConfig = async () => {
    try {
      const response = await fetch('/api/admin/config');
      if (!response.ok) {
        if (response.status === 401) {
          console.log('需要登录才能获取认证配置');
          return;
        }
        throw new Error('Failed to fetch auth config');
      }

      const data = await response.json();
      if (data.success && data.data.auth) {
        setAuthConfig(data.data.auth);
      }
    } catch (err) {
      console.error('获取认证配置失败:', err);
    }
  };

  // 在静态部署模式下，不支持动态创建/删除密钥

  const toggleAccessKey = async (id: string) => {
    try {
      const response = await fetch('/api/admin/keys', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();
      if (data.success) {
        setAccessKeys(accessKeys.map(key => 
          key.id === id ? { ...key, enabled: !key.enabled } : key
        ));
      }
    } catch (err) {
      console.error('更新访问密钥状态失败:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/login', { method: 'DELETE' });
      onLogout();
    } catch (err) {
      console.error('退出失败:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchAccessKeys();
    fetchAuthConfig();
    setLoading(false);

    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">静态Web代理系统 - 管理控制台</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              退出登录
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 标签页 */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              系统状态
            </button>
            <button
              onClick={() => setActiveTab('keys')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'keys'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              访问密钥管理
            </button>
          </nav>
        </div>

        {/* 系统状态标签页 */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">系统状态</h2>
              <button
                onClick={fetchStatus}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                刷新状态
              </button>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                错误: {error}
              </div>
            )}

            {status && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 连接状态 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">连接状态</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>活跃连接:</span>
                      <span className="font-mono text-green-600">{status.connections.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>总连接数:</span>
                      <span className="font-mono">{status.connections.total}</span>
                    </div>
                  </div>
                  
                  {status.connections.sites && status.connections.sites.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">已连接站点:</h4>
                      <div className="space-y-1">
                        {status.connections.sites.map((site) => (
                          <div key={site} className="flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span className="font-mono text-sm">{site}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 路由配置 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">动态路由</h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span>活跃路由数:</span>
                      <span className="font-mono">{status.routes.length}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {status.routes && status.routes.map((route) => (
                      <div key={route.siteId} className="border border-gray-200 rounded p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{route.siteId}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            status.connections.sites && status.connections.sites.includes(route.siteId)
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {status.connections.sites && status.connections.sites.includes(route.siteId) ? '在线' : '离线'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          <div>域名: {route.subdomain}</div>
                          <div>目标: {route.targetUrl}</div>
                          {route.description && <div>描述: {route.description}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 访问密钥管理标签页 */}
        {activeTab === 'keys' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">访问密钥管理</h2>
              <div className="flex items-center gap-4">
                {authConfig && (
                  <div className="text-sm bg-blue-50 px-3 py-1 rounded">
                    当前模式: {authConfig.mode === 'single' ? '单密钥模式' : '多密钥模式'}
                  </div>
                )}
                {isProduction && (
                  <div className="text-sm text-gray-500 bg-yellow-50 px-3 py-1 rounded">
                    生产模式：密钥在配置文件中预定义
                  </div>
                )}
              </div>
            </div>

            {/* 单密钥模式显示 */}
            {authConfig?.mode === 'single' && (
              <div className="bg-white rounded-lg shadow mb-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold">单密钥模式</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    所有客户端使用同一个访问密钥连接到代理服务器
                  </p>
                </div>
                <div className="px-6 py-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">通用访问密钥</div>
                        <div className="text-sm text-gray-600 mt-1">{authConfig.singleKey.description}</div>
                        <div className="text-sm text-gray-500 font-mono mt-2 bg-white px-2 py-1 rounded border">
                          {authConfig.singleKey.key}
                        </div>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(authConfig.singleKey.key.replace('******', ''))}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 ml-4"
                        title="复制密钥"
                      >
                        复制
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 多密钥模式显示 */}
            {authConfig?.mode === 'multi' && (
              <div className="space-y-6">
                {/* 域名映射密钥 */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">域名专用密钥</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      每个域名使用专用的访问密钥
                    </p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {authConfig.multiKeys && authConfig.multiKeys.domainMappings && authConfig.multiKeys.domainMappings.map((mapping, index) => (
                      <div key={index} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{mapping.subdomain}</div>
                            <div className="text-sm text-gray-600 mt-1">{mapping.description}</div>
                            <div className="text-sm text-gray-500 font-mono mt-2 bg-gray-50 px-2 py-1 rounded">
                              {mapping.accessKey}
                            </div>
                          </div>
                          <button
                            onClick={() => navigator.clipboard.writeText(mapping.accessKey.replace('...', ''))}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 ml-4"
                            title="复制密钥"
                          >
                            复制
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 备用密钥 */}
                {authConfig.multiKeys.fallbackKey.key && (
                  <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold">备用密钥</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        用于未预定义域名的访问密钥
                      </p>
                    </div>
                    <div className="px-6 py-4">
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">备用访问密钥</div>
                            <div className="text-sm text-gray-600 mt-1">{authConfig.multiKeys.fallbackKey.description}</div>
                            <div className="text-sm text-gray-500 font-mono mt-2 bg-white px-2 py-1 rounded border">
                              {authConfig.multiKeys.fallbackKey.key}
                            </div>
                          </div>
                          <button
                            onClick={() => navigator.clipboard.writeText(authConfig.multiKeys.fallbackKey.key.replace('...', ''))}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 ml-4"
                            title="复制密钥"
                          >
                            复制
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 兼容模式：显示传统密钥列表 */}
            {(!authConfig || (!authConfig.mode)) && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold">预定义访问密钥</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    这些密钥在配置文件中预定义，客户端可以使用这些密钥连接到代理服务器
                  </p>
                </div>
                <div className="divide-y divide-gray-200">
                  {accessKeys && accessKeys.map((key) => (
                    <div key={key.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{key.name}</div>
                          {key.description && (
                            <div className="text-sm text-gray-600 mt-1">{key.description}</div>
                          )}
                          <div className="text-sm text-gray-500 font-mono mt-2 bg-gray-50 px-2 py-1 rounded">
                            {key.key}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            创建时间: {new Date(key.createdAt).toLocaleString('zh-CN')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            key.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {key.enabled ? '启用' : '禁用'}
                          </span>
                          {!isProduction && (
                            <button
                              onClick={() => toggleAccessKey(key.id)}
                              className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                            >
                              {key.enabled ? '禁用' : '启用'}
                            </button>
                          )}
                          <button
                            onClick={() => navigator.clipboard.writeText(key.key)}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                            title="复制密钥"
                          >
                            复制
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {accessKeys.length === 0 && (
                  <div className="px-6 py-8 text-center text-gray-500">
                    <p>没有找到访问密钥</p>
                    <p className="text-sm mt-1">请在 config.json 文件中配置访问密钥</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
