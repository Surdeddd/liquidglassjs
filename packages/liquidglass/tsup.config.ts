import { defineConfig, type Options } from 'tsup'
import pkg from './package.json'

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
    dts: { resolve: WORKSPACE },
    noExternal: WORKSPACE
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
      resolve: WORKSPACE
    },
    noExternal: WORKSPACE,
    treeshake: false,
    esbuildPlugins: [
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
  }
])
