import { readFileSync } from 'node:fs'
import { defineConfig, type Options } from 'tsup'
import pkg from './package.json'

const workerBundle = new URL('../core/dist-worker/lens-worker.global.js', import.meta.url)

type EsbuildPlugin = NonNullable<Options['esbuildPlugins']>[number]

const workerTextPlugin: EsbuildPlugin = {
  name: 'lens-worker-text',
  setup(build) {
    build.onResolve({ filter: /^virtual:lens-worker$/ }, () => ({
      path: 'virtual:lens-worker',
      namespace: 'lens-worker'
    }))
    build.onLoad({ filter: /.*/, namespace: 'lens-worker' }, () => ({
      contents: readFileSync(workerBundle, 'utf8'),
      loader: 'text'
    }))
  }
}

const WORKSPACE = [
  '@surdeddd/liquidglass-core',
  '@surdeddd/liquidglass-element',
  '@surdeddd/liquidglass-react',
  '@surdeddd/liquidglass-vue',
  '@surdeddd/liquidglass-svelte'
]

const shared: Options = {
  format: ['esm', 'cjs'],
  treeshake: true,
  clean: false,
  external: ['react', 'vue', 'svelte'],
  define: { __LG_VERSION__: JSON.stringify(pkg.version) }
}

export default defineConfig([
  {
    ...shared,
    entry: { index: 'src/index.ts' },
    dts: { resolve: WORKSPACE, compilerOptions: { paths: {} } },
    noExternal: WORKSPACE,
    esbuildPlugins: [workerTextPlugin]
  },
  {
    ...shared,
    entry: {
      element: 'src/element.ts',
      react: 'src/react.ts',
      vue: 'src/vue.ts',
      svelte: 'src/svelte.ts'
    },
    dts: {
      entry: {
        element: 'src/dts/element.ts',
        react: 'src/dts/react.ts',
        vue: 'src/dts/vue.ts',
        svelte: 'src/dts/svelte.ts'
      },
      resolve: WORKSPACE,
      compilerOptions: { paths: {} }
    },
    noExternal: WORKSPACE,
    treeshake: false,
    esbuildPlugins: [
      workerTextPlugin,
      {
        name: 'share-core-with-root-entry',
        setup(build) {
          const target = build.initialOptions.format === 'cjs' ? './index.cjs' : './index.js'
          build.onResolve({ filter: /^@surdeddd\/liquidglass-core$/ }, () => ({
            path: target,
            external: true
          }))
        }
      }
    ]
  },
  {
    ...shared,
    entry: { liquidglass: 'src/index.ts' },
    format: ['iife'],
    globalName: 'LiquidGlass',
    minify: true,
    outExtension: () => ({ js: '.global.js' }),
    noExternal: WORKSPACE,
    esbuildPlugins: [workerTextPlugin]
  }
])
