const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // 确保 TypeScript 路径映射正常工作
    typedRoutes: false,
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // 添加别名解析
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/types': path.resolve(__dirname, 'src/types'),
    };

    // 确保模块解析包含 .ts 和 .tsx 文件
    config.resolve.extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', ...config.resolve.extensions];

    return config;
  },
};

module.exports = nextConfig;
