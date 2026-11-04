import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import rule from './no-liveapi-ctor-in-function.js';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    ecmaVersion: 2020,
    sourceType: 'module',
  },
});

ruleTester.run('no-liveapi-ctor-in-function', rule, {
  valid: [
    'const api = new LiveAPI();',
    'const api = new LiveAPI("live_set");',
    'const other = new Foo();',
    'function make() { return new Foo(); }',
  ],
  invalid: [
    {
      code: 'function liveApi(path) { return new LiveAPI(path); }',
      errors: [{ messageId: 'noConstructInFunction' }],
    },
    {
      code: 'const liveApi = (path) => new LiveAPI(path);',
      errors: [{ messageId: 'noConstructInFunction' }],
    },
    {
      code: 'const liveApi = function (path) { return new LiveAPI(path); };',
      errors: [{ messageId: 'noConstructInFunction' }],
    },
    {
      code: 'class Clip { get(path) { return new LiveAPI(path); } }',
      errors: [{ messageId: 'noConstructInFunction' }],
    },
    {
      code: 'function liveApi(path) { return new LiveAPI(path) as unknown as LiveClip; }',
      errors: [{ messageId: 'noConstructInFunction' }],
    },
  ],
});
