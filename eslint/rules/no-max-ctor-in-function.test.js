import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import rule from './no-max-ctor-in-function.js';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    ecmaVersion: 2020,
    sourceType: 'module',
  },
});

ruleTester.run('no-max-ctor-in-function', rule, {
  valid: [
    'const api = new LiveAPI();',
    'const f = new File();',
    'const api = new LiveAPI("live_set");',
    'const f = new File(path, "write");',
    'const other = new Foo();',
    'function make() { return new Foo(); }',
    {
      code: 'function make() { return new Dict(); }',
    },
    {
      code: 'function make() { return new Dict(); }',
      options: [{ constructors: ['LiveAPI'] }],
    },
  ],
  invalid: [
    {
      code: 'function liveApi(path) { return new LiveAPI(path); }',
      errors: [{ messageId: 'noConstructInFunction', data: { name: 'LiveAPI' } }],
    },
    {
      code: 'function writeText(path) { const f = new File(path, "write"); }',
      errors: [{ messageId: 'noConstructInFunction', data: { name: 'File' } }],
    },
    {
      code: 'const liveApi = (path) => new LiveAPI(path);',
      errors: [{ messageId: 'noConstructInFunction', data: { name: 'LiveAPI' } }],
    },
    {
      code: 'const write = function (path) { return new File(path, "read"); };',
      errors: [{ messageId: 'noConstructInFunction', data: { name: 'File' } }],
    },
    {
      code: 'class Host { open(path) { return new File(path, "read"); } }',
      errors: [{ messageId: 'noConstructInFunction', data: { name: 'File' } }],
    },
    {
      code: 'function liveApi(path) { return new LiveAPI(path) as unknown as LiveClip; }',
      errors: [{ messageId: 'noConstructInFunction', data: { name: 'LiveAPI' } }],
    },
    {
      code: 'function make() { return new Dict(); }',
      options: [{ constructors: ['Dict'] }],
      errors: [{ messageId: 'noConstructInFunction', data: { name: 'Dict' } }],
    },
  ],
});
