import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "3agent-dev-agentimage-cazhuxxs.s3.us-east-1.amazonaws.com",
        port: "",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "3agent-production-agentimage-cazhuxxs.s3.us-east-1.amazonaws.com",
        port: "",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
        port: "",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "abs.twimg.com",
        port: "",
        pathname: "**",
      },
    ],
  },
};

export default nextConfig;
