import * as esbuild from 'esbuild';

const isDev = process.argv.includes('--dev');
const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/webview/index.tsx'],
  bundle: true,
  outfile: 'build/webview.js',
  format: 'iife',
  jsx: 'automatic',
  minify: !isDev,
  sourcemap: isDev,
  define: {
    'process.env.NODE_ENV': isDev ? '"development"' : '"production"',
  },
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('Watching webview...');
} else {
  await esbuild.build(buildOptions);
  console.log('Webview built.');
}
