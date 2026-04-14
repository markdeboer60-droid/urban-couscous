import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure serverComponentsExternalPackages for Prisma and PDF rendering
  serverExternalPackages: ["@prisma/client", "prisma", "@react-pdf/renderer"],
};

export default nextConfig;
