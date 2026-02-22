import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  outDir: 'output',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'GitBlog',
    version: '0.1.0',
    description: 'Manage your Jekyll + GitHub Pages blog from a Chrome extension.',
    permissions: ['storage'],
    host_permissions: ['https://api.github.com/*'],
    icons: {
      16: 'icons/icon-16.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    action: {
      default_icon: {
        16: 'icons/icon-16.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png',
      },
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
    css: {
      postcss: {
        plugins: [],
      },
    },
  }),
});
