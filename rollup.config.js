import commonjs from 'rollup-plugin-commonjs'
import json from 'rollup-plugin-json'
import nodeResolve from 'rollup-plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'
import typescript from 'rollup-plugin-typescript'
import { main, module as moduleFile, dependencies } from './package.json'

const plugins = [
  json({ preferConst: true }),
  nodeResolve({ mainFields: ['module', 'jsnext:main', 'main'] }),
  commonjs(),
  typescript({ resolveJsonModule: false }),
  !process.env.ROLLUP_WATCH && terser(),
]

export default [
  {
    plugins,
    external: Object.keys(dependencies || {}),
    input: `src/entry.ts`,
    output: { file: main, format: 'cjs', exports: 'named' },
  },
  {
    plugins,
    input: `src/entry.ts`,
    output: { file: moduleFile, format: 'esm' },
  },
  {
    plugins,
    input: `src/polyfill.browser.ts`,
    output: { file: main.replace(/\.[^\.]+$/, '.browser.js'), format: 'iife' },
  },
]
