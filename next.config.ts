import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'nodemailer', 'twilio'],
};

export default nextConfig;
