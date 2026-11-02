# 香蕉成熟、酶與碳水化合物的水解

Offline bilingual Form 4 biology teaching simulator. Open `index.html` directly in a modern browser. No runtime dependencies, server or login is needed.

## Teaching controls

- **A 水解反應:** choose starch, maltose or sucrose hydrolysis. Enzyme names appear immediately. Play, pause, replay, or drag the timeline in either direction. Each example lasts 14 seconds.
- **B 香蕉成熟:** four zoom levels, a 32-second timeline, and a final discussion/summary. Molecular level is named **多糖與雙糖的水解**.
- Language changes preserve playback time. Reduced motion, keyboard seeking and full screen are supported.
- Continuous demonstration plays all three reactions followed by banana exploration in 74 seconds. Seeking pauses and exits continuous demonstration.

## Revised molecular model

The displayed six-unit starch chain in Part A is completely converted to three maltose molecules through two successive hydrolyses. In level 04, the eight-unit chain becomes four maltose molecules through three hydrolyses; maltase then hydrolyses all four maltose molecules into eight glucose molecules. Each broken bond uses one H₂O. Seeking backwards restores substrates, bonds and water accounting.

Water is labelled **H₂O**, without an atomic drawing. Only working enzymes are shown. Amylase is teal, maltase purple and sucrase terracotta. Amylase has an extended groove; maltase has two glucose-shaped pockets; sucrase has glucose/fructose-shaped pockets. The raised region positions the selected bond; it is not a blade. Real binding also involves chemical interactions and protein flexibility.

The simplified, unbranched model illustrates the lesson's starch → maltose reaction. It does not claim that every amylase produces only maltose or that the complete branched starch structure is degraded by one enzyme. The banana pathway involves additional enzymes and intermediates. Maltase is a classroom hydrolysis example, not an assertion of the sole or dominant banana maltose pathway. A granule contains many tightly packed starch chains, represented schematically by several chains; it is not a hollow container.

## Uploaded photos and zoom

Level 01 uses `assets/banana.jpeg` and marks the exposed pulp. Level 02 uses `assets/banana cell.jpg` and marks one dark starch granule. Level 03 enlarges that same region, then fades into a labelled structural model containing several starch chains. Individual molecular chains are not directly resolved in the microscope image.

The exact JPEGs are embedded in `index.html` as data URLs, so the single file continues to work offline. The originals remain in `assets/` for future editing. The photo does not establish ripeness, magnification, or actual reaction locations.

## Validation

```sh
npm ci
npx playwright install --with-deps chromium
npm test
```

Browser checks cover complete reaction products and water balance, enzyme reuse and docking, named enzymes, distinct colours and shapes, reversible timelines in both modes, playback/language controls, continuous demonstration, and bilingual layouts at mobile, tablet and desktop widths.

Existing GitHub Pages workflow tests and publishes `index.html` after a push to main. No deployment is performed by opening the local file.

Sources and model limits are available in the page's teacher notes. Supplied textbook PDFs are not redistributed.
