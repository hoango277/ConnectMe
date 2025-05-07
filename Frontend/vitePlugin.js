// This plugin adds polyfills for global objects needed by SockJS
export function sockjsPolyfill() {
  return {
    name: 'sockjs-polyfill',
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { type: 'module' },
          children: `
            // Polyfill for SockJS which requires global
            window.global = window;
          `,
          injectTo: 'head-prepend'
        }
      ]
    }
  }
}