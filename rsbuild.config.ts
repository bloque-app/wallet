import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';
import { tanstackRouter } from '@tanstack/router-plugin/rspack';

const APP_ENV = process.env.PUBLIC_APP_ENV || 'prod';
const isProd = APP_ENV === 'prod';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  html: {
    template: './public/index.html',
    templateParameters: {
      TITLE: `Wallet ${isProd ? 'Bloque' : 'Dev'}`,
      MANIFEST: isProd ? '/manifest.json' : '/manifest.dev.json',
    },
  },
  plugins: [pluginReact(), pluginTailwindcss()],
  tools: {
    rspack: {
      module: {
        rules: [
          {
            test: /\.(?:js|jsx|ts|tsx)$/,
            use: {
              loader: 'builtin:swc-loader',
              options: {
                detectSyntax: 'auto',
                jsc: {
                  transform: {
                    react: { runtime: 'automatic' },
                    reactCompiler: true,
                  },
                },
              },
            },
          },
        ],
      },
      plugins: [
        tanstackRouter({
          target: 'react',
          autoCodeSplitting: true,
        }),
      ],
    },
  },
});
