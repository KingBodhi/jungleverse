import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
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
        hostname: "www.hippodromecasino.com",
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
      {
        protocol: "https",
        hostname: "images.contentstack.io",
      },
      {
        protocol: "https",
        hostname: "unavatar.io",
      },
      {
        protocol: "https",
        hostname: "kings-resort.com",
      },
      {
        protocol: "https",
        hostname: "images.squarespace-cdn.com",
      },
      {
        protocol: "https",
        hostname: "media-cdn.tripadvisor.com",
      },
      {
        protocol: "https",
        hostname: "bestbetjax.com",
      },
      {
        protocol: "https",
        hostname: "s3-media0.fl.yelpcdn.com",
      },
      {
        protocol: "https",
        hostname: "cdn-storage.okadamanila.com",
      },
      {
        protocol: "https",
        hostname: "www.thebike.com",
      },
      {
        protocol: "https",
        hostname: "www.seminolehardrocktampa.com",
      },
      {
        protocol: "https",
        hostname: "www.bancocasino.sk",
      },
      {
        protocol: "https",
        hostname: "admin.kings-resort.com",
      },
    ],
  },
};

export default nextConfig;
