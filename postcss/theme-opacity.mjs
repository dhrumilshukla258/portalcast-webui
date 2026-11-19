// Tailwind writes bg-accent/10 twice: a fixed Classic hex, then a themed color-mix()
// under @supports. TVs without color-mix only see the hex. Use the palette to build
// their translucent colors too; preserve Tailwind's exact fallback outside Minimal.
export default {
  postcssPlugin: 'portalcast-theme-opacity',
  OnceExit(root) {
    const usages = new Map();
    root.walkAtRules('supports', at => {
      if (!at.params.includes('color-mix')) return;
      const base = at.prev();
      if (base?.type !== 'rule') return;
      at.walkDecls(d => {
        if (d.parent.selector !== base.selector) return;
        const mix = d.value.match(/color-mix\(in oklab,\s*var\((--color-[\w-]+)\)\s+([\d.]+)%,\s*transparent\)/);
        if (!mix) return;
        const fallback = base.nodes.find(n => n.type === 'decl' && n.prop === d.prop);
        if (!fallback || !/^#(?:[\da-f]{4}|[\da-f]{8})$/i.test(fallback.value)) return;
        const [, token, percent] = mix;
        if (!usages.has(token)) usages.set(token, new Map());
        const shades = usages.get(token);
        if (!shades.has(percent)) shades.set(percent, []);
        shades.get(percent).push(fallback);
      });
    });

    const colors = new Map();
    root.walkRules(rule => {
      if (!/html\[data-tv-theme=["']minimal["']\]/.test(rule.selector)) return;
      const defs = rule.nodes.filter(d => d.type === 'decl' && d.prop.startsWith('--color-'));
      for (const d of defs) colors.set(d.prop, d.value);
      for (const { prop: token, value } of defs) {
        if (!usages.has(token)) continue;
        // Minimal's legacy palette uses hex colors and aliases to its semantic tokens.
        const hex = value.startsWith('var(') ? colors.get(value.slice(4, -1)) : value;
        if (!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex ?? '')) continue;
        const solid = hex.length === 4 ? '#' + [...hex.slice(1)].map(c => c + c).join('') : hex;
        for (const [percent, fallbacks] of usages.get(token)) {
          const prop = token.replace('--color-', '--pc-opacity-') + '-' + percent.replace('.', '_');
          const alpha = Math.round(255 * Number(percent) / 100).toString(16).padStart(2, '0');
          rule.append({ prop, value: solid + alpha });
          for (const d of fallbacks) if (d.value[0] === '#') d.value = `var(${prop}, ${d.value})`;
        }
      }
    });
  },
};
