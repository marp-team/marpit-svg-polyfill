import path from 'path'
import commonjs from 'rollup-plugin-commonjs'
import json from 'rollup-plugin-json'
import nodeResolve from 'rollup-plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'
import typescript from 'rollup-plugin-typescript'
import pkg from './package.json'

const basename = path.basename(pkg.main, '.js')
const outputDir = path.dirname(pkg.main)

const external = [...Object.keys(pkg.dependencies || {})]

const plugins = [
  json({ preferConst: true }),
  nodeResolve({ jsnext: true }),
  commonjs(),
  typescript({ resolveJsonModule: false }),
  !process.env.ROLLUP_WATCH && terser(),
]

export default [
  {
    external,
    plugins,
    input: `src/${basename}.ts`,
    output: {
      file: `${outputDir}/${basename}.js`,
      format: 'cjs',
      exports: 'named',
    },
  },
  {
    external,
    plugins,
    input: `src/${basename}.ts`,
    output: {
      file: `${outputDir}/${basename}.mjs`,
      format: 'esm',
    },
  },
  {
    external,
    plugins,
    input: `src/${basename}.browser.ts`,
    output: {
      file: `${outputDir}/${basename}.browser.js`,
      format: 'iife',
    },
  },
]
