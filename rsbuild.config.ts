import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { TanStackRouterRspack } from '@tanstack/router-plugin/rspack';

const APP_ENV = process.env.PUBLIC_APP_ENV || 'prod';
const isProd = APP_ENV === 'prod';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  html: {
    template: './public/index.html',
    templateParameters: {
      TITLE: `Wallet ${isProd ? 'Bloque' : 'Dev'}`,
    },
  },
  plugins: [pluginReact()],
  tools: {
    rspack: {
      plugins: [TanStackRouterRspack()].filter(Boolean),
    },
  },
});
