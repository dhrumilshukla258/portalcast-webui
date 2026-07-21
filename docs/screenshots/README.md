Screenshots referenced by the main `README.md`'s gallery:

| Filename | What it shows |
|----------|------------------|
| `movies.png` | Movies browse grid, with the category sidebar visible |
| `discover.png` | The Discover tab — genre rows |
| `movies-details.png` | A movie's detail page |
| `series-details.png` | A series' detail page with season/episode list |
| `discover-group.png` | The variant-picker modal shown when a title has multiple language/quality versions |
| `admin.png` | The Admin Dashboard's Stats tab |

**Blur convention**: these screenshots have all real content blurred, leaving only generic UI chrome sharp (nav bar, logo, buttons, static labels, dialog copy, layout, colors). Specifically blurred:

- Poster art, backdrops, and channel logos (`img.object-cover`)
- Titles at every level — page/category title, movie/series title, episode names, channel names (`h1`/`h3`/`h4` throughout the app)
- Category names — both the Movies/Series sidebar+bar and the Live TV category list
- Movie/series detail metadata — director line, rating/year/country/duration row, genre tags, Overview text, Cast list
- Admin Dashboard — all stat numbers (user counts, portal request counts, category-breakdown counts) and the Live Streams/Recent Logins tables' Title/User/Client IP/Name/Email columns

Left sharp on purpose: nav bar, buttons, static UI labels ("Categories", "Continue Watching", "Overview", "Cast" as headings), dialog copy ("This title is available in multiple versions — pick one:"), version-variant labels ("Hindi Dub", "Kannada 4K"), stat card labels, table column headers, and chart axis/gridlines.

If you add a new screenshot, the fastest way to reproduce this is entirely client-side via the browser DevTools Console (F12) — no image editing needed:

```js
// Images + all title-level text
document.querySelectorAll('img.object-cover, img[class*="object-cover"], h1, h3, h4')
  .forEach(el => el.style.filter = 'blur(20px)');

// Movies/Series category sidebar + horizontal category bar
document.querySelectorAll('[data-focus-group="categories"]')
  .forEach(el => el.style.filter = 'blur(15px)');

// Section headings (blur all except static UI labels), and Live TV's category list
// (found via its "Categories" <h2>, since it has no unique attribute)
document.querySelectorAll('h2').forEach(h => {
  const t = h.textContent.trim();
  if (t === 'Categories') {
    const list = h.parentElement.nextElementSibling;
    if (list) list.style.filter = 'blur(15px)';
  } else if (t !== 'Continue Watching') {
    h.style.filter = 'blur(15px)';
  }
});

// Movie/series detail page: director line, rating/year/meta row, genre tags
document.querySelectorAll('h1').forEach(h1 => {
  const titleWrap = h1.parentElement;
  const next = h1.nextElementSibling;
  if (next && next.tagName === 'P') next.style.filter = 'blur(8px)';

  const metaRow = titleWrap.nextElementSibling;
  if (metaRow) metaRow.style.filter = 'blur(8px)';

  const genresBlock = metaRow ? metaRow.nextElementSibling : null;
  if (genresBlock && !genresBlock.querySelector('h3')) {
    genresBlock.style.filter = 'blur(8px)';
  }
});

// Overview text + Cast list (the block right after their <h3> label)
document.querySelectorAll('h3').forEach(h => {
  const t = h.textContent.trim();
  if (t === 'Overview' || t === 'Cast') {
    const next = h.nextElementSibling;
    if (next) next.style.filter = 'blur(10px)';
  }
});

// Admin Stats tab: all StatCard numbers + category-breakdown counts
document.querySelectorAll('div.mt-2.text-2xl.font-black.text-white')
  .forEach(el => el.style.filter = 'blur(8px)');
document.querySelectorAll('span.font-mono.text-xs.text-gray-300')
  .forEach(el => el.style.filter = 'blur(6px)');

// Admin Stats tab: Live Streams (Title/User/IP) + Recent Logins (Name/Email) table columns
document.querySelectorAll('h3').forEach(h => {
  const t = h.textContent.trim();
  const card = h.closest('.rounded-2xl');
  if (!card) return;
  const table = card.querySelector('table');
  if (!table) return;

  if (t === 'Live Streams') {
    table.querySelectorAll('tbody tr').forEach(tr => {
      const c = tr.querySelectorAll('td');
      [1, 3, 4].forEach(i => { if (c[i]) c[i].style.filter = 'blur(6px)'; });
    });
  }
  if (t === 'Recent Logins') {
    table.querySelectorAll('tbody tr').forEach(tr => {
      const c = tr.querySelectorAll('td');
      [0, 1].forEach(i => { if (c[i]) c[i].style.filter = 'blur(6px)'; });
    });
  }
});
```

Run all of it in the Console in one paste on the page you're screenshotting, take the screenshot, then refresh to undo (it's live-DOM only, nothing is saved or changed in the app).

Also double check for real hostnames, emails, or usernames anywhere in the shot before committing — these ship in the public repo. Add a new row to the table above and a matching `<td>` entry in the main `README.md`'s gallery.
