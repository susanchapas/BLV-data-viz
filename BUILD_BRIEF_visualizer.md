# Build brief: BLV smart glasses study visualizer

Hand this whole file to the coding agent. Work the phases in order. Stop at the end of each phase and report before continuing.

---

## 0. What this is

A web application that visualizes a qualitative accessibility study. 17 semi-structured interviews with blind and low-vision users of consumer AI smart glasses. The study argues that feedback about the system's own state is an accessibility feature and the one the product supplies least.

Two output targets from one codebase:

1. **Web.** Interactive, filterable, animated. For sharing with collaborators and for talks.
2. **Print.** Static vector figures for an ACM CHI submission, delivered as PDF.

Both targets render from the same chart components and the same data. A figure in the paper and the same figure on the web must be the same picture and the same numbers.

## 1. Non-negotiables

Read these before writing any code. They override any default you would otherwise reach for.

**Provenance.** Every number rendered anywhere traces to a row in the workbook. No computed convenience values that cannot be pointed at. Every chart carries a `source` field naming the tab and rows behind it, and the interface displays it.

**The workbook is the source of truth.** The app never opens the .xlsx at runtime. A build step extracts to JSON. Rebuilding is the only way data changes.

**Never rewrite source data.** The extractor reads. It does not write back to the workbook.

**P011 is a different device.** P011 uses EchoVision by AGIGA. Every other participant uses Ray-Ban Meta. P011 must be excluded from pooled counts by default, with a visible control to include. Any figure showing a pooled count must carry a device-split note. There is no exception to this.

**Accessibility is the subject.** An inaccessible visualizer for a study about accessibility fails on its own terms. Section 7 is a hard requirement, tested, no partial marks.

**Greyscale by default.** Colour only for ranking columns (severity, impact, effort) or a single point of emphasis per view.

**Do not invent data.** If a value is absent in the workbook, render it as absent. Several ratings are stored as text specifically so they drop out of a plot rather than being imputed. Preserve that.

---

## 2. Source file

`Susan_Coding_Workbook.xlsx`, 19 tabs.

Structural facts confirmed by inspection. Do not assume, these are measured:

| Tab | Header row | Rows | Structure |
|---|---|---|---|
| Headline | 3 | ~40 | Label, Result, Detail. Stacked by round. Row 24 starts a `ROUND 3` block that supersedes rows above it |
| Round 3 Results | 3 | ~90 | Section, Item, New, All 17, Reading. Section-title rows have only column A filled |
| Round 4 Results | 3 | 36 | Section, Item, Was, Now, Reading |
| Findings | 3 | 22 themes | Theme, Name, examples, why it matters, Sub-themes, P001..P017, Total |
| Pain Points | 3 | — | Tag (PP-nn), pain point, what happens, theme, sub-theme, who, evidence codes, plus three round-update columns |
| Opportunities | 3 | — | Tag (DO-nn), do this, detail, theme, fixes (references PP tags) |
| Insights & Clusters | 3 | — | Type, #, Title, Note, Spans, Evidence codes. Section-title rows have only column A |
| Contradictions | 3 | — | Tag (X-nn), question, what each participant reports, who, reading, evidence codes, two update columns |
| Chart Data | see 3.2 | — | 20 pre-specified chart tables in stacked blocks |
| Feedback & Signal | 3 | — | Tag (FB-nn), signal, status, applies, what device does, cost of absence, basis, blank col, P001..P017, Rows, Participants, blank, Code 1..3 |
| Verification Asymmetry | 3 | 28 | Tag (VA-01..VA-28), failure mode, failure class, task surface, evidence codes, detectable without sight, detection channel, cost to detect, basis, consequence, P001..P017, Rows, Participants |
| Non-use | 3 | — | Reason, Who, What it looks like, Primary code, Lever |
| Comparison | 3 | — | Group, Attribute, P001..P017, then several count/who column pairs at different denominators (n=10, n=14, n=17). Use the n=17 pair |
| Participants | 3 | 18 attrs | **Transposed.** Attribute in column A, one column per participant |
| Sub-themes | 3 | — | Theme, Theme name, Sub-theme, Note, P001..P017, Coded quotes. Section-title rows in column A |
| Research & Limits | 3 | — | Type, #, Note |
| Evidence | 3 | **2146 data rows** | #, Who, Theme, Theme name, Sub-theme, Label as coded, Code, Quote, Line |
| Codebook | 3 | **361 codes** | Code, Label, Note, Theme, Theme name, Sub-theme, Status, P001..P017, Total. Section-title rows in column A |
| Mode Codes | 3 | 28 | Tag, failure mode, Code 1..Code 6. `ZZ-UNUSED` is a filler value, drop it |

Verified totals to assert against: **2146 evidence rows, 17 participants, 361 distinct codes, 22 themes, 28 failure modes.**

Known staleness to handle: the Headline tab's first block reports 14 participants and 1389 rows. The `ROUND 3` block further down reports 17 and 2146. The extractor must take the latest block and must flag the discrepancy in the build report rather than quietly picking one.

---

## 3. Phase 1: extraction

Python. `openpyxl` plus `pandas`. Output to `/data/`.

### 3.1 General rules

- Two-pass load where formulas matter. `data_only=True` for values.
- Skip section-title rows. A section-title row has column A filled and every other column empty.
- Strip whitespace, normalise participant IDs to `P0nn`.
- Wide participant blocks (P001..P017 as columns) get melted to long form: `{code, participant, count}`.
- Emit `manifest.json`: workbook sha256, build timestamp, per-tab row counts, extractor version.

### 3.2 Chart Data parser

This tab holds 20 chart tables stacked vertically. The pattern repeats:

```
row n     : "Chart 7. Feedback the device gives against feedback it withholds"
row n+1   : "Clustered bar. Signal types and evidence rows by status. Reads off the Feedback & Signal tab."
row n+2   : header row
row n+3.. : data rows, until a blank row
```

Some blocks carry a trailing footnote row after the data. Some titles cover two charts (`Chart 12 and Chart 13`). Handle both.

Parse by walking column A for `^Chart \d+`. Emit one object per chart:

```json
{
  "id": "chart-07",
  "title": "Feedback the device gives against feedback it withholds",
  "caption": "Clustered bar. Signal types and evidence rows by status.",
  "source_tab": "Feedback & Signal",
  "chart_type": "clustered_bar",
  "columns": ["Signal type", "Announced", "Silent"],
  "rows": [...],
  "footnote": "...",
  "alt_text": null
}
```

`chart_type` is inferred from the first word of the caption. `alt_text` is written by hand later and stored in an override file so a rebuild never destroys it.

### 3.3 Output files

```
data/
  manifest.json
  evidence.json            2146 rows
  codebook.json            361 codes + long-form participant counts
  participants.json        untransposed, one object per participant
  themes.json              from Findings
  subthemes.json
  verification.json        VA-01..VA-28, joined to Mode Codes
  feedback.json            FB tags
  pain_points.json
  opportunities.json
  contradictions.json
  non_use.json
  comparison.json
  insights.json
  research_limits.json
  headline.json            latest round block, with a superseded flag on earlier ones
  charts/chart-01.json ... chart-20.json
  alt_text.json            hand-written, never overwritten by the build
```

Total should land near 2 MB uncompressed. Small enough to load in full.

### 3.4 Validation, run on every build

The build fails on any assertion failure. Print a table of every check with pass or fail.

- Evidence row count equals 2146 and equals the count named on Round 4 Results
- Distinct codes in Evidence equals the Codebook row count, 361
- Every `Code` in Evidence exists in the Codebook. Every Codebook code appears in Evidence at least once, or carries a status explaining why not
- Codebook per-participant columns sum to the Total column, per row
- Sub-themes per-participant columns sum to `Coded quotes`, per row
- Findings per-theme totals sum to the Evidence count for that theme
- Verification Asymmetry `Rows (n=17)` equals the sum of its participant columns. Same for `Participants (n=17)` as a count of non-zero columns
- Chart 1 column totals reconcile to Verification Asymmetry by detectability class
- Chart 2 rows reconcile to Verification Asymmetry rows
- Every `Basis (cited evidence row)` reference, format `P0nn Lnnn`, resolves to an Evidence row with that participant and line
- Every code named in Pain Points, Opportunities, Insights, Contradictions and Feedback & Signal exists in the Codebook
- Every `Fixes` reference on Opportunities resolves to a Pain Points tag
- Participant count is 17 and device split is 16 Ray-Ban Meta plus 1 EchoVision

Write failures to `build_report.json` and to stdout. Do not repair anything automatically. Report and stop.

**Deliverable for phase 1:** the extractor, the validation module, the emitted `/data/`, and a build report. Report which assertions failed before moving on.

---

## 4. Phase 2: application

### 4.1 Stack

- Vite, React 18, TypeScript, strict mode
- **visx** for chart primitives. D3 scales and shape generators as React components emitting plain SVG. Do not use a canvas-rendering library. The SVG output is what makes the print path work
- **Framer Motion** for animation. Animate to explicit target values so the resting frame is deterministic
- **Arquero** for in-browser filtering and grouping over the evidence table
- Tailwind for layout. Design tokens in section 9
- Vitest plus Testing Library. `@axe-core/react` in development
- No routing library needed beyond `react-router` for deep links

### 4.2 Interaction model, the manipulable part

Global filter state, applied to every view at once, held in a URL query string so any view can be linked and cited:

- Participant, multi-select, 17 options, with `include P011` off by default
- Theme, multi-select, 22 options
- Code, searchable multi-select, 361 options
- Detectability class: undetectable, partly detectable, self-evident
- Failure class, from Verification Asymmetry
- Signal status: announced, silent, consequence
- Vision status, device generation, years at current vision level, from Participants
- Free-text search across quotes

Behaviour:

- Every filter is cross-cutting. Selecting a code on the codebook view filters the charts, the evidence table and the participant grid together
- Selecting any mark on any chart drills to the evidence rows behind it. This is the primary interaction. A bar is a query
- Every view has a "show the rows" control that opens the underlying Evidence subset with participant, line number and verbatim quote
- Filter state is serialised to the URL. Deep links reproduce a view exactly
- A reset control clears everything and says how many filters were cleared
- Counts update live and always state their denominator, for example `9 of 16 Ray-Ban Meta participants`
- When a filter excludes P011, say so on screen. Never let a pooled count appear without its device note

Views to build, in this order:

1. **Evidence explorer.** Virtualised table over 2146 rows. Sort, filter, full-text search, column visibility. The spine of the app
2. **Verification asymmetry.** The 28 failure modes. Detectability, cost to detect, consequence, evidence weight. This carries the paper's argument
3. **Signal ledger.** Announced against silent, from Feedback & Signal
4. **Theme and code browser.** 22 themes, 361 codes, participant breadth against evidence weight
5. **Participant profiles.** One page per participant, all 18 attributes, their coded rows, their position on each measure
6. **Chart gallery.** The 20 pre-specified charts, each with title, caption, source, alt text and a data table

### 4.3 Chart component contract

Every chart is one React component with this signature:

```tsx
interface ChartProps<T> {
  data: T[];
  mode: 'web' | 'print';
  width: number;          // print: exact final size in points
  height: number;
  animate?: boolean;      // ignored when mode is 'print'
  title: string;
  caption: string;
  source: string;         // tab and rows
  altText: string;
  deviceNote?: string;    // required when the count pools participants
}
```

Rules:

- Returns a plain `<svg>` element tree. No canvas, no WebGL, no imperative DOM handling outside React
- `mode="print"` changes type size, stroke weights and margins. It does not change the numbers or the marks
- The component must render identically under `renderToStaticMarkup` in Node with no browser globals. Test this
- Every chart exports its data as CSV from the same array it plots

### 4.4 Animation

- Entry only, plus transitions between filter states. No ambient motion, no looping
- Duration 200 to 400 ms. Ease out. Stagger series by at most 30 ms per element
- The resting frame is the print figure. Nothing about the final state depends on animation having run
- `prefers-reduced-motion: reduce` skips to the final frame immediately. Also provide an in-app motion toggle, because the OS setting is not always what the person wants for one session
- Bars grow from the axis. Lines draw along their path. Points fade and settle. Nothing bounces, nothing overshoots a value it should not pass through

---

## 5. Phase 3: publication export

A Node script, `scripts/export-figures.ts`.

- Imports the same chart components. Calls `renderToStaticMarkup` with `mode="print"`, `animate={false}`
- Writes `figures/fig-NN.svg`, then converts to PDF with `resvg` or Inkscape CLI. Inkscape handles font embedding best
- Does not convert text to outlines. Selectable text in the figure is part of the accessibility requirement
- Emits `figures/fig-NN.tex` containing a `\includegraphics` block with the caption and a `\Description{}` populated from the same `altText` string the web app uses. One alt text, both outputs
- Emits `figures/fig-NN.csv` with the plotted data, for supplementary material
- Emits `figures/manifest.json` linking each figure to its source tab and rows

Sizing: design at final printed size. Do not draw large and scale down, it ruins stroke weights and type size. Get the target width by putting `\the\columnwidth` and `\the\textwidth` in the acmart document and reading the log. Pass those numbers in as points. Ask the researcher for them rather than guessing.

Type in figures: 7 to 8 pt after placement. Match the body face of the acmart template if possible.

Print styling: greyscale fills, distinguished by value and by texture. Direct labels on marks wherever the layout allows, so the reader does not have to move between a legend and a bar.

---

## 6. Repo layout

```
/extract          Python. Workbook to JSON
  extract.py
  parsers/        one module per tab family
  validate.py
  run.sh
/data             build artifact, committed so the app builds without the workbook
/src
  /charts         one file per chart, dual-mode
  /components
  /views
  /lib            filter state, arquero queries, url serialisation
  /tokens         design tokens
/scripts
  export-figures.ts
/figures          build artifact
/tests
```

---

## 7. Accessibility requirements

Target WCAG 2.2 AA as the floor. The people who will use this include screen reader users. Treat every item here as testable and test it.

**Structure and keyboard**

- Semantic landmarks. One `h1` per view, heading order never skips a level
- Every interactive element reachable by keyboard, in a sensible order, with a focus indicator of at least 3:1 contrast against both adjacent colours
- Skip link to main content. Skip link to the data table on every chart
- Target size 24 by 24 CSS pixels minimum, 44 preferred
- No keyboard trap anywhere, including in the virtualised table

**Charts specifically**

- Every SVG carries `role="img"` and an `aria-labelledby` pointing at a `<title>` and `<desc>`. The `<desc>` is the alt text, and it states the trend and the extremes, plus the denominator
- Every chart has a paired data table, in the DOM, reachable by keyboard, either always visible or behind a toggle whose state persists across the session
- Charts are keyboard navigable at the mark level. Arrow keys move between marks, Enter drills to the evidence rows, Escape returns. Announce each mark on focus with a live region: series, category, value, denominator
- Never colour alone. Position, direct labels and texture carry the information. Verify each figure by desaturating it
- Minimum 3:1 contrast for graphical objects, 4.5:1 for text

**Live regions and change**

- Filter changes announce the resulting count in a polite live region. For example: "Filtered to 212 evidence rows, 1 participant, P011 excluded"
- Do not fire an announcement per keystroke. Debounce to about 500 ms
- Loading and error states are announced, and error text says what to do next

**Motion**

- `prefers-reduced-motion` honoured everywhere, plus an in-app toggle
- No motion is required to understand anything. Every animation is decorative by design

**Text and zoom**

- Reflow at 320 CSS pixels wide with no horizontal scrolling
- Usable at 200 percent zoom, and at 400 percent for the text-heavy views
- No text in images. Chart text is SVG text
- Respect user font size settings. Size in `rem`

**Quotes**

- Verbatim participant quotes render as `<blockquote>` with a `<cite>` carrying participant and line number
- Never truncate a quote in a way that changes its sense. Truncate with an expand control and mark it

**Testing**

- `axe-core` in CI, zero violations to merge
- Manual pass with VoiceOver and with NVDA. Write down what you find in `docs/a11y-testing.md`
- Keyboard-only pass of every view, no pointer
- Every chart checked in greyscale

---

## 8. Definition of done

**Phase 1.** All 19 tabs extracted. All validation assertions run and reported. Build fails loudly on a mismatch. `manifest.json` present with the workbook hash.

**Phase 2.** Six views built. Global cross-filtering works from any view. Every chart drills to evidence. Filter state round-trips through the URL. `axe-core` clean. Keyboard-only pass complete. P011 handled correctly everywhere.

**Phase 3.** All 20 charts export to PDF at a named final size with embedded fonts and selectable text. Each figure has a `.tex` stub, a `.csv` and an alt text string identical to the web version. Numbers in the exported figures match the web figures exactly, verified by comparing the CSVs.

---

## 9. Design tokens

- Greyscale ramp, 6 steps, from near-white to near-black. Fills distinguished by value and by texture
- Colour reserved for ranking columns and for one emphasis point per view
- Type: Albert Sans for the web application. Print figures match the paper's body face
- Restrained layout. No decorative chrome. The data carries the page
- Sentence case throughout. Controls named by what happens when they are used

---

## 10. Ask rather than assume

Stop and ask before you decide any of these:

- Final figure widths in points, from the acmart build
- Which of the 20 charts go in the paper, and at what size
- Whether P013's gender is resolved, because it affects any participant-level display of that field
- Whether TRU-NODELEGATE and NONUSE-HABIT have been split, because it changes the code count
- Whether the 1894 pre-existing evidence rows have had their verbatim quote re-pull pass, because unverified quotes should be marked in the interface until they do
- Whether task context has been added to the Evidence tab, since one planned figure needs it
- Whether this will be deployed publicly, which changes how much verbatim quote text should be exposed

---

## 11. First three commands

1. Read the workbook and print every tab name, dimensions, and the first six rows of each. Confirm against the table in section 2 and report any difference.
2. Build the Chart Data parser alone. Print all 20 parsed chart objects. Show them before building anything else.
3. Build the validation module against the raw workbook, before any app code exists. Report which of the assertions in 3.4 pass today.
