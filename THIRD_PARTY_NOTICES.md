# Sources and attribution

The website links to official repositories, provider documentation and source feeds. Tool records retain source URLs and verified-field dates. No third-party tool binaries are redistributed. GitHub licensing badges are used only as field-scoped evidence and do not cover all bundled components.

Security+ objective identifiers are mapped to the CompTIA SY0-701 objectives document version 5.0 retrieved 2026-10-21. The provider owns that document and its trademarks. Original lesson prose, scenarios, questions and flashcards are independent educational content. Current exam status has not been verified; no affiliation is claimed.

CERT/CC and SANS RSS/Atom adapters perform link-only indexing. CISA KEV, NVD and FIRST EPSS retain source attribution and dates. Source terms and public-deployment suitability require maintainer review. See data/sources.json and docs/AUTOMATION.md. No live records were retrieved successfully in the authoring environment.

Original synthetic data: public/datasets/manifest.json lists provenance and SHA-256 values. It contains no actual university traffic, personal information, credentials or malware. The normalizer's fixtures use an obviously synthetic future CVE identifier and are never presented as current intelligence.

## Geography

The home globe renders real country geometry, not a hand-drawn approximation. `public/assets/geo/ne_110m_countries.json` is a compact local derivative of Natural Earth 1:110m Admin 0 Countries, vendored so the page makes no runtime map request.

- Dataset: Natural Earth 1:110m Admin 0 Countries
- Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson
- Download: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson
- Retrieved: 2026-10-22
- Source SHA-256: `6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f` (838,726 bytes)
- Terms: https://www.naturalearthdata.com/about/terms-of-use/ — public domain
- Attribution: Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com.
- Transformation: coordinates rounded to 0.0001 degrees and consecutive duplicates removed; rings that would collapse retain their original precision. Polygon holes and multipolygons are retained. `scripts/fetch_geography.py` reproduces the asset and validates the FeatureCollection, geometry types, country count and ring validity.

GitHub Actions are official actions pinned to upstream release commits checked on 2026-10-21. Their own licenses apply when GitHub executes them. Runtime Python and Node retain their own licenses. This repository declares no npm or Python package dependencies.

Fonts: Archivo (The Archivo Project Authors) and Martian Mono (The Martian Mono Project Authors) are self-hosted under the SIL Open Font License 1.1. License texts ship beside the files in public/assets/fonts/. They are served from this site because the Content Security Policy allows fonts from 'self' only.

Brand assets: the CyberHub Core logo family in public/assets/brand/ is original to this project.

## Photography (field band)

Photos listed in `data/photos.json` come from Unsplash under the Unsplash License (free for commercial and non-commercial use, no permission needed; attribution appreciated). Each entry links to its source page. Fetch them with `python scripts/fetch_photos.py`. Before committing a photo, confirm on its page that it is a free Unsplash License photo and not Unsplash+. All five below were checked as free Unsplash License photos on 2026-10-22 and are committed at 1600 px wide.

| File | Photographer | Source |
| --- | --- | --- |
| server-aisle.jpg | Taylor Vick | https://unsplash.com/photos/M5tzZtFCOfs |
| robot-arm.jpg | Homa Appliances | https://unsplash.com/photos/sz1CHL7Pky0 |
| circuit-board.jpg | Ludovico Ceroseis | https://unsplash.com/photos/8hcIIZ8SoyU |
| patch-panel.jpg | Albert Stoynov | https://unsplash.com/photos/dyUp7WPu5q4 |
| old-monitor.jpg | Nick Russill | https://unsplash.com/photos/QKQEnPLiCK8 |
