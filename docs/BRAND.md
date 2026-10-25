# Brand

CyberHub follows the CISO CyberHub design system: a black machine environment, a cool paper editorial environment, and one signal color, CISO blue (`#0068bc`, sampled from the CISO seal). The site's styles live in `web/site.css`; its tokens mirror the design system's.

## Logo files

All files are in `public/assets/brand/` and are served at `/assets/brand/`.

| File | Where the site uses it |
| --- | --- |
| `cyberhub-core-on-dark.svg`, `-on-light.svg` | Header mark (32px), footer Core, hero still frame before the live 3D Core starts |
| `cyberhub-core-animated.svg` | Homepage loader. Never shown when reduced motion is set |
| `cyberhub-lockup-on-dark.svg` | Footer lockup |
| `cyberhub-favicon.svg` | Copied to `/assets/favicon.svg` at build time |
| `cyberhub-app-icon.svg` | Apple touch icon |
| `ciso-seal.png` | Footer "Powered by" sign-off only, once per page |
| `*-on-light`, `*-mono-*`, `*-stacked-*`, `*-wordmark-*`, `*-app-icon-blue` | Not used by the site; kept for slides, print and social |

## Rules that matter in code

- The wordmark is set in Archivo at 62% width, weight 830, in capitals. CYBER is solid, HUB is a blue outline. Never fill HUB, never outline CYBER.
- The CISO seal never replaces the Core and never sits beside it at the same size.
- Soft corners on a three-step scale (`web/site.css`, RADIUS SYSTEM): 6–10px for badges, code and inputs; 12px for buttons, chips and header controls; 20px for cards, panels and tile-grid frames; 28px for the large object frames (lab device, machine-render band). Full-bleed scenes, list rows and rules stay straight. Never pill-shaped except progress tracks and dots.
- Color carries meaning: blue is the signal (live, selected, important). Amber marks stale or failing sources.
- Motion eases with `cubic-bezier(.2,.7,0,1)` and turns off under `prefers-reduced-motion`.

## Fonts

Archivo (display and body) and Martian Mono (labels, counters) are self-hosted in `public/assets/fonts/` under the SIL Open Font License. Commercial faces common on award sites (Druk, Aeonik, Neue Haas) are deliberately not used: Archivo's narrow, heavy setting covers that role without a license.
