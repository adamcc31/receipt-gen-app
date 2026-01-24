import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost:3000",
    "127.0.0.1:3000",
    "172.16.0.2:3000",
    "172.16.0.2",
  ],
};

export default nextConfig;
