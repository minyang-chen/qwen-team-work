import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../../../', '');
  const uiServerPort = env.WEBUI_SERVER_PORT || '8002';
  console.log('Vite config - UI Server port:', uiServerPort);

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          team: resolve(__dirname, 'team.html'),
        },
      },
    },
    server: {
      port: 8003,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: `http://localhost:${uiServerPort}`,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path,
        },
      },
    },
    define: {
      __API_BASE_URL__: `"http://localhost:${uiServerPort}"`,
    },
  };
});
