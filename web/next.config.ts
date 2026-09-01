import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La collecte lit des flux externes : elle ne doit jamais etre mise en
  // cache par le rendu statique.
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
};

export default nextConfig;
