import type { NextConfig } from "next";

const API_INTERNAL_URL =
  process.env.API_INTERNAL_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // Allow images served from Azure Blob Storage (any container under any storage account)
    // and the public CDN front-end (Azure Front Door / Azure CDN).
    remotePatterns: [
      { protocol: "https", hostname: "*.blob.core.windows.net",   pathname: "/**" },
      { protocol: "https", hostname: "*.azureedge.net",            pathname: "/**" },
      { protocol: "https", hostname: "*.azurefd.net",              pathname: "/**" },
    ],
  },
  async rewrites() {
    return [
      { source: "/api/auth/:path*",    destination: `${API_INTERNAL_URL}/api/auth/:path*` },
      { source: "/api/teams/:path*",   destination: `${API_INTERNAL_URL}/api/teams/:path*` },
      { source: "/api/teams",          destination: `${API_INTERNAL_URL}/api/teams` },
      { source: "/api/gallery/:path*", destination: `${API_INTERNAL_URL}/api/gallery/:path*` },
      { source: "/api/gallery",        destination: `${API_INTERNAL_URL}/api/gallery` },
      { source: "/api/seasons/:path*", destination: `${API_INTERNAL_URL}/api/seasons/:path*` },
      { source: "/api/seasons",        destination: `${API_INTERNAL_URL}/api/seasons` },
      { source: "/api/profile/:path*",     destination: `${API_INTERNAL_URL}/api/profile/:path*` },
      { source: "/api/profile",            destination: `${API_INTERNAL_URL}/api/profile` },
      { source: "/api/tournaments/:path*", destination: `${API_INTERNAL_URL}/api/tournaments/:path*` },
      { source: "/api/tournaments",        destination: `${API_INTERNAL_URL}/api/tournaments` },
      { source: "/identity/:path*",        destination: `${API_INTERNAL_URL}/identity/:path*` },
    ];
  },
};

export default nextConfig;
