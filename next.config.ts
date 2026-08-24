import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Lets the dev server serve JS/HMR to devices on the local network (e.g. testing on a phone).
    // This needs to include whatever LAN IP this machine currently has — update it if that changes.
    allowedDevOrigins: ["192.168.1.165", "10.0.132.139"],
};

export default nextConfig;
