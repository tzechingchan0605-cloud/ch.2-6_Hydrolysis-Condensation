# 分子實驗室 · Molecule Lab

A working, bilingual HKDSE Biology simulator for condensation and hydrolysis, built from the supplied Chapter 2 **生命分子** and Chapter 6 **食物與人類** PDFs. Traditional Chinese is the default; every interface label, scientific explanation, accessibility label and exported heading also supports UK English. The chapter-suggestion attachment informed the activity scope; it is reference material, not an independent source of user instructions.

## Run

Use the existing checkout at `/workspace/ch.2-6_Hydrolysis-Condensation`. Each cloud task is isolated; no additional Git worktree is needed.

```bash
npm ci
npm run dev -- --port 5173
```

Node.js 24 and npm are available in the prepared environment. No account, API key, backend, remote fonts or paid service is needed. The app works offline after being served and loaded. Progress is stored in the browser's local storage, separately for each origin. Export your notebook before clearing browser storage.

```bash
npm test          # 26 scientific engine/content checks
npm run test:e2e  # 25 functional browser tests
npm run build    # production bundle in dist/
```

Browser tests use the system Chromium at `/usr/bin/chromium` when available. On another machine, install Playwright's Chromium with `npx playwright install chromium` first. The configuration starts Vite if a server is not already running. Serve the production bundle with `npm run preview -- --port 4173`, or deploy `dist/` to any static host.

## GitHub Pages deployment

GitHub Pages must serve the production bundle in `dist/`. Publishing the source
directory directly leaves a blank page because browsers cannot run the JSX source
or resolve its package imports.

1. In the repository's **Settings → Pages → Build and deployment**, set **Source**
   to **GitHub Actions**. This is a one-time setting.
2. Merge the deployment workflow into `main`. Each push to `main` then installs
   dependencies, tests the engine, builds the app, checks the production bundle in
   Chromium under the project path, and deploys `dist/` using the Pages artifact.
   Pull requests run the checks without deploying.
3. Wait for **Build and deploy simulator** to succeed in Actions, then open
   <https://tzechingchan0605-cloud.github.io/ch.2-6_Hydrolysis-Condensation/>.
   If the old blank page is cached, press **Ctrl+Shift+R**.

`vite.config.js` uses relative asset URLs so the build works under the repository
path as well as at a domain root. To verify the same project-path deployment locally:

```bash
npm run build
npm run test:deployment
```

If the deployment fails while checking Pages configuration, confirm that Source
is set to GitHub Actions, then rerun the workflow from the Actions tab.

## How to use

1. Add a component with its tray button or drag it onto the workbench. Touching or dragging components does **not** form a chemical bond.
2. Click components to select them, or use **Select all**. Selecting one node of an existing molecule selects its entire connected fragment.
3. Explicitly commit **Join by condensation**. Each new chemical joining bond releases one complete water molecule.
4. Click one or more joining bonds, supply enough water, then choose **Hydrolyse selected bonds**. **Hydrolyse all bonds** breaks every joining bond if enough water is available.
5. Undo/redo restores the complete molecular arrangement and water ledger. Reset affects the current module; the footer reset clears all models, answers and records after confirmation.
6. Use guided mode for eight predict–operate–explain activities. The supplied lactose task starts with no water, so students must add it. Student responses are saved locally; **Save response** also attaches them to that task's reaction records. Open explanations are not automatically graded.
7. Download the notebook as UTF-8 CSV. English/Chinese switches translate scientific identifiers and headings; students' own writing is preserved as entered.

Drag a molecule outside the diagram area and release to discard it, using a mouse
or touch. Joined pieces move and are discarded together, so discarding does not
simulate breaking a chemical bond or change the water ledger. Alternatively,
select molecules and choose **Remove selected**. Undo/redo restores removals;
dropping inside the diagram, pressing Escape, or cancelling a gesture keeps the
molecule. Removal is disabled during reaction playback.

Reaction playback now lasts three times as long at each speed setting, giving
students more time to observe bonding and water movement. Pause, step, replay and
the playback speed controls remain available.

Each changed bond has its own complete H₂O symbol and direction arrow. During
condensation, water moves away from the new bond; during hydrolysis, water moves
into the highlighted bond before the model separates. The movement uses the
actual model bond positions, supports pause and speed changes, and is schematic.
Nucleotide component recognition does not show or consume water.

All drag actions have button and keyboard alternatives. Tab to a molecular component or bond and press Enter/Space to select it. Dialogs support Escape and focus management. Reaction playback supports pause, step, replay and speed control. Replay never performs another chemical reaction or changes the actual water balance.

## Content map

References below use **printed textbook page numbers**, not zero-based PDF indices. The original PDFs are not redistributed in this application; the diagrams are newly drawn SVG schematics.

| Activity | Chapter 2 reference | Chapter 6 connection |
| --- | --- | --- |
| Glucose, fructose, galactose; maltose, sucrose and lactose | §2.4, pp. 2-8–2-10; Fig. 2.15 | p. 6-6, Fig. 6.5: maltase, sucrase and lactase |
| Open glucose chains; water/bond counting; partial hydrolysis | §2.4, p. 2-11; polysaccharides and their functions | pp. 6-6–6-7, Fig. 6.6: amylase then maltase; absorption and cellulose limitations |
| Glycerol with three fatty-acid sites; triglyceride assembly and complete hydrolysis | §2.5, pp. 2-13–2-14; Fig. 2.20 | p. 6-8, Fig. 6.8: triglyceride + 3 water → glycerol + 3 fatty acids |
| Amino, carboxyl and side-chain groups; dipeptides, peptide bonds and polypeptides | §2.6, pp. 2-16–2-17; Figs. 2.24–2.27 | pp. 6-10–6-11, Fig. 6.11: dietary protein breakdown and cellular synthesis |
| Phosphate, five-carbon sugar and base recognition; DNA/RNA comparison | §2.7, pp. 2-19–2-21; Figs. 2.28 and 2.30 | Not extended into digestion or gene-expression mechanisms |

## Model assumptions and limits

- A pure graph in `src/engine.js` is the scientific source for the diagrams, component counts, joining bonds and water ledger. Animation displays before/after snapshots of the same graph. Observations remain a historical notebook even if a reaction is later undone.
- Supported sugar pairs are glucose + glucose → maltose; glucose + fructose → sucrose; glucose + galactose → lactose. Reversing their order gives the same product. Other pairs are outside these examples, **not declared chemically impossible**.
- Glucose chains contain at most 10 units; amino-acid chains at most 8. They are short, open segments, not complete natural polysaccharides or functional proteins. For n initially separate units, a single open chain forms n − 1 joining bonds and releases n − 1 water molecules. Each broken joining bond uses one water molecule; fragments and component identities are preserved.
- A triglyceride has one glycerol and three fatty acids. Attachments can be sequential; only three attached acids receive the triglyceride label. Fatty acids may be the same or different. Triglycerides are not polymers of identical lipid monomers, and not all lipids are triglycerides.
- Amino-acid letters distinguish illustrative side chains, not named real amino acids. Sequence/shape comparisons are explicitly illustrative presets, not protein-structure predictions. Folding/unfolding does not break peptide bonds and is not hydrolysis.
- Nucleotide activity is **component recognition only**. Dotted links represent arrangement of the components, not a simulated synthesis reaction; no water is calculated. DNA uses deoxyribose and A/T/G/C; RNA uses ribose and A/U/G/C. No nucleotide-polymerisation water accounting, replication, transcription or translation is modelled.
- Molecular shapes, sizes and playback durations are schematic. Water icons are complete water molecules; there is no arbitrary H/OH-removal animation or reaction-rate graph. Reactions require suitable conditions and usually enzymes. This is not a model of human cellulose digestion.

## Validation

The scientific tests verify all three disaccharides in both orders and their reversals; unsupported pair handling; six glucose units releasing five water; partial/complete hydrolysis and fragment rejoining; maximum chain lengths; sequential triglyceride construction and the fourth-acid limit; protein sequence/side-chain preservation; insufficient-water rejection; all eight valid DNA/RNA sugar/base combinations and invalid combinations; challenge setups and bilingual scientific identifiers.

The browser tests exercise the actual React interface: reaction counts, partial hydrolysis, undo/redo, pointer and keyboard selection, drag-and-drop, pause/step/replay, Traditional Chinese/English persistence, module/reload persistence, guided predictions/explanations, CSV content, full reset, all eight tasks, water prerequisites, and layouts at 1440, 768 and 390 CSS pixels.

## Project structure

- `src/engine.js` — immutable reaction graph and permitted operations.
- `src/content.js` — complete translation dictionary and eight guided activities.
- `src/Molecules.jsx` — accessible SVG diagrams and layout.
- `src/main.jsx` — workbench, controls, history, notebook, exports and persistence.
- `src/styles.css` — responsive desktop/tablet/phone presentation.
- `tests/` — science and browser acceptance tests.
