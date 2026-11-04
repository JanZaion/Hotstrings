import noMaxCtorInFunction from './rules/no-max-ctor-in-function.js';

const plugin = {
  meta: {
    name: 'eslint-plugin-max',
    version: '1.0.0',
  },
  rules: {
    'no-max-ctor-in-function': noMaxCtorInFunction,
  },
};

export default plugin;
