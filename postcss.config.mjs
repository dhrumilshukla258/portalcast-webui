import cascadeLayers from '@csstools/postcss-cascade-layers';
import legacyFallbacks from './postcss/legacy-fallbacks.mjs';
import themeOpacity from './postcss/theme-opacity.mjs';

// Tailwind, then what older browsers need (vite.config.ts SUPPORTED): cascade layers (Chrome 99,
// Safari 15.4) rewritten as specificity, the same cascade without @layer, and the gated
// fallbacks in postcss/legacy-fallbacks.mjs. Colours and logical properties are lowered by
// Lightning CSS when the CSS is minified (vite.config.ts css.lightningcss).
export default {
  plugins: [
    // optimize: flatten Tailwind's nested @supports before cascadeLayers, which drops nested
    // at-rules. Production does this by default; without it the dev server loses every
    // `color/opacity` utility's var() form, so themes cannot recolour them.
    (await import('@tailwindcss/postcss')).default({ optimize: { minify: false } }),
    cascadeLayers(),
    themeOpacity,
    legacyFallbacks(),
  ],
};
