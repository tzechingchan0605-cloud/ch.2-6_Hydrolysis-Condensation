# 香蕉成熟、酶與碳水化合物的水解

Banana Ripening, Enzymes and Carbohydrate Hydrolysis

中四 CMI 生物教師投影工具。舊的 React 分子工作台已被本模型取代。

## 直接使用 / Open offline

下載 `index.html`，用現代瀏覽器直接開啟即可。所有 CSS、JavaScript、SVG 均已包含在檔案內，毋須伺服器、網絡、登入或安裝套件。右上角可切換繁中／English；切換時保留播放進度。

Download `index.html` and open it directly in a modern browser. The page includes all CSS, JavaScript and SVG. It needs no server, network connection, account or installed package. Language switching preserves playback progress.

## 教師操作 / Teacher guide

1. 選水解反應，先讓學生口頭預測所需的酶，再播放或揭示名稱。每組約 14 秒，包含同一個酶再次催化的示範。
2. 指出水移近被突出顯示的鍵；斷鍵後產物離開，水不再作為完整水分子出現。
3. 切換香蕉成熟，觀看約 32 秒的逐層放大模型，回看學生的實驗繪圖；按「顯示總結」才揭示解釋。
4. 「課堂連續示範」依序播放三組水解及香蕉成熟，總長約 74 秒。可暫停、繼續及重播；手動選反應會停止連續示範。

Choose a reaction, invite an oral prediction, and reveal the enzyme or press Play. Each 14-second example includes reuse of the same enzyme. The 32-second banana zoom ends with two discussion questions; the summary appears only on request. Continuous demonstration plays all four scenes in 74 seconds. Pause, replay, full screen and reduced motion are available.

The collapsible model notes inside the page explain the scientific simplifications, observation limits and primary references. No actual micrographs were supplied or fabricated. Sugar symbols are displayed separately from the schematic cell/granule view.

## Zoom story and scientific qualifications

The page starts with an unripe banana. Play or use the four level buttons to zoom
into a schematic pulp cell, a starch granule, and an accessible surface-chain
teaching model. The time bar supports seeking and pausing; its seconds are playback
time, not actual ripening days. Reduced motion uses discrete views.

The molecular example tracks one eight-unit segment: two successive end cleavages
release two maltose pairs and leave four starch units. Each pair then undergoes a
separate maltase hydrolysis example, producing four glucose molecules in total.
The four broken bonds use four water molecules. β-amylase is used for endwise
maltose release; this is not a complete banana pathway or a claim that maltase is
the dominant, sole, or co-located route for banana maltose metabolism.

The later phase illustrates greater available catalytic capacity with extra enzyme
symbols and overlapping reactions. Each bound hydrolysis step keeps its 1.6-second
duration; icons are not measured enzyme counts and do not assert that all enzymes
increase indefinitely. Real rate also depends on accessible substrate and conditions.

Newly drawn shapes and Chinese terminology follow supplied Chapter 5, pp. 5-7–5-8,
Figs. 5.5–5.6, and Chapter 6, p. 6-6, Figs. 6.5–6.6. The PDFs are not redistributed.

Additional sources: [IUBMB β-amylase](https://iubmb.qmul.ac.uk/enzyme/EC3/2/1/2.html),
[Xiao et al. (2018)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5785343/) and
[Bassinello et al. (2002)](https://pubmed.ncbi.nlm.nih.gov/12358438/).

## Tests and hosting

Application runtime: **no dependencies and no build step**. `package.json` and Playwright exist solely for development checks.

```sh
npm ci
npx playwright install chromium
npm test
```

Tests load the complete saved HTML document into Chromium, with external requests blocked and no application server. They check reaction products, cleavage/water counts, enzyme reuse, timing and controls, all four scenes in the continuous demonstration, bilingual state retention, responsive layouts and full screen.

The existing GitHub Pages Actions workflow tests and publishes the single file. Alternatively, this page also supports **Deploy from a branch → main → / (root)** because it is already browser-ready HTML.

Primary references: [Prabha & Bhagyalakshmi (1998)](https://doi.org/10.1016/S0031-9422(97)00931-X) and IUBMB [EC 3.2.1.1](https://iubmb.qmul.ac.uk/enzyme/EC3/2/1/1.html), [EC 3.2.1.20](https://iubmb.qmul.ac.uk/enzyme/EC3/2/1/20.html), [EC 3.2.1.48](https://iubmb.qmul.ac.uk/enzyme/EC3/2/1/48.html).
