Screenshots shown in the main `README.md`:

| Filename | What it shows |
|----------|---------------|
| `home.jpg` | Home on a PC: the title to resume, Continue Watching, "Because you watched" |
| `title.jpg` | A movie's page: tagline, ratings, cast and crew with photos, More Like This |
| `phone.jpg` | Three phones: Home, Sports (live matches with their channels) and Cast |

**How they are made**: the real built app (`dist/`) in headless Chromium with every API request
answered by demo data, so no server, account, provider, channel list or address is involved. PC
shots are 1920×1080, phone shots 390×844 at 3×, then framed (window / phone) on the black-blue
background and saved as JPEG (about 250 KB each).

**Demo data only, never a real install.** Artwork has to be free to publish: public-domain film
posters and stills, the Blender Foundation's open movies (CC BY) and free-licence portraits, all from
Wikimedia Commons; keep the credit line under the images in `README.md` when changing them. Before
committing a new shot, check it for hostnames, emails, user names and provider or channel names
from a real setup: these files are public.
