// Fallbacks for older browsers (see vite.config.ts SUPPORTED: Chrome 69, Safari 12...), for CSS
// that Tailwind 4 writes and Lightning CSS cannot lower. Each fallback is a copy of the original
// rule behind a class that only browsers missing the feature get (index.html sets them), so
// modern browsers see exactly the CSS they saw before:
//   .no-where      no :where() / :is() (Chrome < 88, Safari < 14): the rule again with
//                  :where(x) -> x and :is(x) -> :-webkit-any(x). Old browsers drop a whole rule
//                  whose selector they cannot parse (Tailwind's space-y-*, preflight resets).
//   .no-translate  no `translate` / `scale` / `rotate` properties (Chrome < 104): a transform
//                  built from Tailwind's --tw-* values (-translate-x-1/2 centring, hover:scale-*).
//   .no-flexgap    no gap in flexbox (Chrome < 84, Safari < 14.1): margins between children,
//                  left in a row and top in a column, following responsive flex-row / flex-col.
// (aspect-ratio is done by a script in index.html: a CSS box cannot work in a flex container.)
//   .no-atprop     no @property (Chrome < 85): Tailwind's starting values for its --tw-*
//                  variables (gradient stops, shadows, borders...). Tailwind's own fallback block
//                  only targets old Safari and Firefox; without it gradients and shadows vanish.
// Also, for everyone: logical properties (padding-inline, margin-block-start, inset...) get their
// physical twins first, identical in a left-to-right page; Lightning CSS does not lower them when
// the value has a var(), which Tailwind's spacing always does. And 100dvh/svh get 100vh first.

const unwrapWhere = (sel) => {
  // :where(x) -> x, keeping nested parentheses intact.
  let out = '', i = 0;
  while (i < sel.length) {
    const j = sel.indexOf(':where(', i);
    if (j < 0) { out += sel.slice(i); break; }
    out += sel.slice(i, j);
    let depth = 1, k = j + 7;
    while (k < sel.length && depth) { if (sel[k] === '(') depth++; else if (sel[k] === ')') depth--; k++; }
    out += sel.slice(j + 7, k - 1);
    i = k;
  }
  return out.replace(/:is\(/g, ':-webkit-any(');
};

/** `sel` under the html class: `html` / `:root` selectors take the class themselves. */
const gate = (cls, sel) => {
  const s = sel.trim();
  if (/^(html|:root)\b/.test(s)) return s.replace(/^(html|:root)/, `html.${cls}`);
  return `.${cls} ${s}`;
};

/** Space-separated parts of a value, ignoring spaces inside parentheses (calc(a * b)). */
const parts = (v) => {
  const out = []; let depth = 0, cur = '';
  for (const ch of String(v).trim()) {
    if (ch === '(') depth++; else if (ch === ')') depth--;
    if (/\s/.test(ch) && depth === 0) { if (cur) out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
};

// Logical -> physical (left-to-right). Shorthands take one value or start/end.
const LOGICAL = {
  'padding-inline': ['padding-left', 'padding-right'], 'padding-block': ['padding-top', 'padding-bottom'],
  'margin-inline': ['margin-left', 'margin-right'], 'margin-block': ['margin-top', 'margin-bottom'],
  'inset-inline': ['left', 'right'], 'inset-block': ['top', 'bottom'],
  'scroll-padding-inline': ['scroll-padding-left', 'scroll-padding-right'], 'scroll-padding-block': ['scroll-padding-top', 'scroll-padding-bottom'],
  'scroll-margin-inline': ['scroll-margin-left', 'scroll-margin-right'], 'scroll-margin-block': ['scroll-margin-top', 'scroll-margin-bottom'],
  'border-inline': ['border-left', 'border-right'], 'border-block': ['border-top', 'border-bottom'],
  'border-inline-width': ['border-left-width', 'border-right-width'], 'border-block-width': ['border-top-width', 'border-bottom-width'],
  'border-inline-style': ['border-left-style', 'border-right-style'], 'border-block-style': ['border-top-style', 'border-bottom-style'],
  'border-inline-color': ['border-left-color', 'border-right-color'], 'border-block-color': ['border-top-color', 'border-bottom-color'],
};
const LOGICAL_SIDE = {
  'padding-inline-start': 'padding-left', 'padding-inline-end': 'padding-right', 'padding-block-start': 'padding-top', 'padding-block-end': 'padding-bottom',
  'margin-inline-start': 'margin-left', 'margin-inline-end': 'margin-right', 'margin-block-start': 'margin-top', 'margin-block-end': 'margin-bottom',
  'inset-inline-start': 'left', 'inset-inline-end': 'right', 'inset-block-start': 'top', 'inset-block-end': 'bottom',
  'border-inline-start-width': 'border-left-width', 'border-inline-end-width': 'border-right-width',
  'border-inline-start-color': 'border-left-color', 'border-inline-end-color': 'border-right-color',
  'border-inline-start-style': 'border-left-style', 'border-inline-end-style': 'border-right-style',
  'border-inline-start': 'border-left', 'border-inline-end': 'border-right', 'border-block-start': 'border-top', 'border-block-end': 'border-bottom',
  'border-start-start-radius': 'border-top-left-radius', 'border-start-end-radius': 'border-top-right-radius',
  'border-end-start-radius': 'border-bottom-left-radius', 'border-end-end-radius': 'border-bottom-right-radius',
};
function physical(decl) {
  const imp = decl.important;
  if (LOGICAL_SIDE[decl.prop]) return [[LOGICAL_SIDE[decl.prop], decl.value, imp]];
  if (LOGICAL[decl.prop]) {
    const v = /^border-(inline|block)$/.test(decl.prop) ? [decl.value] : parts(decl.value);
    const [a, b] = LOGICAL[decl.prop];
    return [[a, v[0], imp], [b, v[1] ?? v[0], imp]];
  }
  if (decl.prop === 'inset') {
    const v = parts(decl.value);
    const [t, r = t, bo = t, l = r] = v;
    return [['top', t, imp], ['right', r, imp], ['bottom', bo, imp], ['left', l, imp]];
  }
  return null;
}

/** A CSS escape backslash (`.sm\:flex-row`), kept out of template literals. */
const BS = String.fromCharCode(92);

export default function legacyFallbacks() {
  return {
    postcssPlugin: 'portalcast-legacy-fallbacks',
    OnceExit(root, { Rule, Declaration, parse: postcssParse }) {
      const added = [];
      let hasGap = false;
      const finishLogical = () => {
      // Logical properties: physical twins first (old browsers drop the logical ones).
        root.walkDecls((d) => {
          if (d.parent && d.parent.type === 'atrule') return;
          const phys = physical(d);
          if (!phys) return;
          for (const [prop, value, important] of phys) d.cloneBefore({ prop, value, important });
        });
      };
      root.walkRules((rule) => {
        if (rule.parent && rule.parent.type === 'atrule' && /keyframes/i.test(rule.parent.name)) return;
        if (rule.selector.includes('.no-where') || rule.selector.includes('.no-translate') || rule.selector.includes('.no-aspect') || rule.selector.includes('.no-flexgap')) return;
        const sels = rule.selectors;

        // :where() / :is()
        if (/:where\(|:is\(/.test(rule.selector)) {
          const clone = rule.clone({ selectors: sels.map((s) => gate('no-where', unwrapWhere(s))) });
          added.push([rule, clone]);
        }

        const decls = {};
        rule.each((n) => { if (n.type === 'decl') decls[n.prop] = n; });

        // translate / scale / rotate -> transform
        if (decls.translate || decls.scale || decls.rotate) {
          const fns = [];
          if (decls.translate) fns.push('translate(var(--tw-translate-x, 0), var(--tw-translate-y, 0))');
          if (decls.rotate) fns.push(`rotate(${decls.rotate.value})`);
          if (decls.scale) fns.push('scale(var(--tw-scale-x, 1), var(--tw-scale-y, 1))');
          const clone = new Rule({ selectors: sels.map((s) => gate('no-translate', s)) });
          clone.append(new Declaration({ prop: 'transform', value: fns.join(' ') }));
          added.push([rule, clone]);
        }

        // gap -> --pc-gx / --pc-gy on the container's children, which the direction rules below
        // turn into margins. Set on the children themselves: a child that is a flex container too
        // keeps the value its container gives it.
        if ((decls.gap || decls['column-gap'] || decls['row-gap']) && !rule.selector.includes('grid')) {
          const gapParts = decls.gap ? parts(decls.gap.value) : [];
          const clone = new Rule({ selectors: sels.map((s) => gate('no-flexgap', s) + ' > *') });
          const gx = decls['column-gap']?.value ?? gapParts[gapParts.length - 1];
          const gy = decls['row-gap']?.value ?? gapParts[0];
          if (gx && (decls.gap || decls['column-gap'])) clone.append(new Declaration({ prop: '--pc-gx', value: gx }));
          if (gy && (decls.gap || decls['row-gap'])) clone.append(new Declaration({ prop: '--pc-gy', value: gy }));
          added.push([rule, clone]);
          hasGap = true;
        }

        // 100dvh / 100svh: 100vh first
        rule.each((n) => {
          if (n.type === 'decl' && /\b\d+(?:\.\d+)?[ds]vh\b/.test(n.value) && !/^var\(/.test(n.value)) {
            n.cloneBefore({ value: n.value.replace(/(\d+(?:\.\d+)?)[ds]vh\b/g, '$1vh') });
          }
        });
      });
      // Each fallback right after its rule, inside the same @media / @supports.
      for (let i = added.length - 1; i >= 0; i--) added[i][0].after(added[i][1]);

      // Tailwind's starting values for its variables, for browsers without @property.
      root.walkAtRules('supports', (at) => {
        if (!/-webkit-hyphens/.test(at.params)) return;
        at.walkRules((r) => {
          if (!r.selector.includes('*')) return;
          const clone = r.clone({ selectors: ['html.no-atprop', '.no-atprop *', '.no-atprop :before', '.no-atprop :after'] });
          at.after(clone);
        });
      });

      // Gap as margins: each flex child after the first, left in a row, top in a column; the
      // direction follows the element's flex-row / flex-col classes at each breakpoint. Unbumped
      // (unlayered) rules, so a child's own margin utility (ml-auto...) still wins.
      // Their weight: the layer flattening (postcss.config.mjs) gives layered rules ID-level
      // weight (:not(#\#)), base 2 and utilities 4. Three: above the base reset (margin: 0), under
      // utilities (a child's ml-auto wins). Added once, to the CSS that has the gap utilities.
      const W = `:not(#${BS}#)`.repeat(3);
      const gapRules = [
        // Children of a flex container without a gap class get 0 (the bumped gap rules win).
        [`.no-flexgap .flex${W} > *, .no-flexgap .inline-flex${W} > *`, '--pc-gx: 0; --pc-gy: 0'],
        [`.no-flexgap .flex${W} > * + *, .no-flexgap .inline-flex${W} > * + *`, 'margin-left: var(--pc-gx, 0)'],
        [`.no-flexgap .flex.flex-col${W} > * + *, .no-flexgap .inline-flex.flex-col${W} > * + *`, 'margin-left: 0; margin-top: var(--pc-gy, 0)'],
      ];
      if (!hasGap) return finishLogical();
      root.append(...gapRules.map(([sel, body]) => postcssParse(`${sel}{${body}}`)));
      for (const [bp, min] of [['sm', '40rem'], ['md', '48rem'], ['lg', '64rem'], ['xl', '80rem'], ['2xl', '96rem']]) {
        // A class may not start with a digit unescaped: 2xl is written  xl, as Tailwind does.
        const cls = /^\d/.test(bp) ? `${BS}3${bp[0]} ${bp.slice(1)}` : bp;
        root.append(postcssParse(`@media (min-width: ${min}) {
          .no-flexgap .flex.${cls}${BS}:flex-row${W} > * + * { margin-top: 0; margin-left: var(--pc-gx, 0) }
          .no-flexgap .flex.${cls}${BS}:flex-col${W} > * + * { margin-left: 0; margin-top: var(--pc-gy, 0) }
        }`));
      }

      finishLogical();
    },
  };
}
legacyFallbacks.postcss = true;
