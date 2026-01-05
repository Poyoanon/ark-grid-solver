export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  // Static site generation for GitHub Pages
  ssr: false,

  devtools: {
    enabled: true
  },

  app: {
    baseURL: '/ark-grid-solver/',
    head: {
      htmlAttrs: {
        lang: 'en'
      }
    }
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
