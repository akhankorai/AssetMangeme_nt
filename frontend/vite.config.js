import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000";
  const vehicleAssetsProxyTarget = env.VITE_VEHICLE_ASSETS_API_TARGET || "http://192.168.100.240:21021";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        "/external-vehicle-api": {
          target: vehicleAssetsProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/external-vehicle-api/, ""),
        },
      },
    },
  };
});
