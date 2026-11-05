import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // By default, Docusaurus generates a sidebar from the docs folder structure
  extensionSidebar: [
    'extensions',
    'with-devtools',
    'with-call-state',
    'with-conditional',
    'with-data-service',
    'with-feature-factory',
    'with-immutable-state',
    'with-reset',
    'with-resource',
    'with-entity-resources',
    'with-storage-sync',
    'with-undo-redo',
    'with-redux',
    'with-pagination',
    'mutations',
  ],
  reduxConnectorSidebar: [
    {
      type: 'category',
      label: 'Redux Connector',
      items: ['create-redux-state'],
    },
  ],
  teamSidebar: ['team'],
  communitySidebar: ['community'],

  // But you can create a sidebar manually
  /*
  tutorialSidebar: [
    'intro',
    'hello',
    {
      type: 'category',
      label: 'Tutorial',
      items: ['tutorial-basics/create-a-document'],
    },
  ],
   */
};

export default sidebars;
