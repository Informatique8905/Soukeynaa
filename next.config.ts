import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Aperçu navigateur / téléphone sur le dev server (HMR, chunks dev)
  allowedDevOrigins: ["127.0.0.1", "192.168.16.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  turbopack: {
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
