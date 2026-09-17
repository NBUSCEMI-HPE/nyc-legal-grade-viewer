# NYC Legal Grade Viewer

Private office web map for engineering lookup of New York City legal grades.

## Current build

- Interactive NYC map
- Street / aerial basemap switching
- NYC address and intersection search
- Map coordinate inspection
- Layer framework for tax lots, legal grades, buildings and curbs
- Separate symbology planned for official versus calculated/interpolated grades
- Responsive office/mobile layout

## Data integrity rule

The application will not present an elevation as an official NYC legal grade unless it comes from a verified City Map / NYC DCP-DEP legal-grade source. Interpolated values will always be identified as calculated values.

## Legal-grade source

NYC DCP and DEP's citywide legal-grade digitization project reports 157,922 QA/QC'd legal-grade points digitized from City Map records. The production application requires the authoritative downloadable dataset or ArcGIS service endpoint before the legal-grade layer is activated.

## Deployment

The app is static and can be deployed through GitHub Pages or another web host. For office-only access, use a host/authentication layer that supports private access rather than relying on a public GitHub Pages site.
