import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {},
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    // Exclude test files and non-JS files from bundling
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /node_modules\/thread-stream\/(test|bench|LICENSE|README)/,
      use: 'null-loader',
    });
    return config
  },
  serverExternalPackages: [
    'pino',
    'pino-pretty',
    'thread-stream',
    'lokijs',
    'encoding'
  ],
};

export default nextConfig;
