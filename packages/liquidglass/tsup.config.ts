import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    element: 'src/element.ts',
    react: 'src/react.ts',
    vue: 'src/vue.ts',
    svelte: 'src/svelte.ts'
  },
  format: ['esm', 'cjs'],
  dts: {
    resolve: [
      '@surdeddd/liquidglass-core',
      '@surdeddd/liquidglass-element',
      '@surdeddd/liquidglass-react',
      '@surdeddd/liquidglass-vue',
      '@surdeddd/liquidglass-svelte'
    ]
  },
  clean: true,
  treeshake: true,
  noExternal: [
    '@surdeddd/liquidglass-core',
    '@surdeddd/liquidglass-element',
    '@surdeddd/liquidglass-react',
    '@surdeddd/liquidglass-vue',
    '@surdeddd/liquidglass-svelte'
  ],
  external: ['react', 'vue', 'svelte']
})
