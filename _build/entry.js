// Entry point para rebundlar o app completo.
// Uso: ./node_modules/.bin/esbuild entry.js --bundle --format=iife --minify --outfile=../dev/bundle.js
//
// Para regenerar apenas libs/tiptap.min.js (ESM, usado pelo source dos módulos):
// ./node_modules/.bin/esbuild tiptap-entry.js --bundle --format=esm --minify --outfile=../dev/libs/tiptap.min.js
