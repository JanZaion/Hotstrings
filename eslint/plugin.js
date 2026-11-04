import noLiveApiCtorInFunction from './rules/no-liveapi-ctor-in-function.js';

const plugin = {
  meta: {
    name: 'eslint-plugin-liveapi',
    version: '1.0.0',
  },
  rules: {
    'no-ctor-in-function': noLiveApiCtorInFunction,
  },
};

export default plugin;
