import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Background images are base64 blobs — increase body size limit to 10 MB
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
