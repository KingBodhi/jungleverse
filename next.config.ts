import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  transpilePackages: ["react-map-gl", "mapbox-gl"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "www.rwlasvegas.com",
      },
      {
        protocol: "https",
        hostname: "foxwoods.com",
      },
      {
        protocol: "https",
        hostname: "commercecasino.com",
      },
      {
        protocol: "https",
        hostname: "dkr2rmsityotp.cloudfront.net",
      },
    ],
  },
};

export default nextConfig;
