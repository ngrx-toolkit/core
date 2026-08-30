import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'NgRx Toolkit',
  tagline: 'Extensions for the NgRx SignalStore',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://ngrx-toolkit.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'ngrx-toolkit', // Usually your GitHub org/user name.
  projectName: 'ngrx-toolkit', // Usually your repo name.
  deploymentBranch: 'main',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',
  onBrokenAnchors: 'throw',
  onDuplicateRoutes: 'throw',
  trailingSlash: false,

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    [
      'docusaurus-plugin-typedoc',
      {
        entryPoints: ['../libs/ngrx-toolkit/src/index.ts'],
        tsconfig: '../libs/ngrx-toolkit/tsconfig.lib.json',
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/ngrx-toolkit/ngrx-toolkit/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social.jpg',
    navbar: {
      title: 'NgRx Toolkit',
      logo: {
        alt: 'NgRx Toolkit Logo',
        src: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'extensionSidebar',
          position: 'left',
          label: 'Extensions',
        },
        {
          to: '/docs/create-redux-state',
          label: 'Redux Connector',
          position: 'left',
        },
        {
          to: '/docs/api/globals',
          label: 'API',
          position: 'left',
        },
        {
          type: 'docSidebar',
          sidebarId: 'teamSidebar',
          position: 'left',
          label: 'Team',
        },
        {
          type: 'docSidebar',
          sidebarId: 'communitySidebar',
          position: 'left',
          label: 'Community',
        },
        {
          href: 'https://github.com/ngrx-toolkit/ngrx-toolkit',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://discord.gg/xnkSWDmpXZ',
          label: 'Discord',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} Community & Angular Architects`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,

  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/ngrx-toolkit/img/apple-touch-icon.png',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/ngrx-toolkit/img/favicon-32x32.png',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/ngrx-toolkit/img/favicon-16x16.png',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'manifest',
        href: '/ngrx-toolkit/img/site.webmanifest',
      },
    },
  ],
};

export default config;
