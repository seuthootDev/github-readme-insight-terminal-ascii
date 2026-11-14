# Windows 98 theme (`theme=win98`) — design

## Why
The cards are terminal-styled (mac / windows PowerShell / ubuntu). The owner wants a fun, nostalgic
theme that almost everyone recognizes. Windows 98 won over XP, amber CRT, classic Mac and pixel art
(XP was hard to make look authentic, the others are too niche, pixel art looked like a different product).

## Goal
`theme=win98` works for **all 12 card types** (plus the error card). Each card borrows the Windows 98
program window whose content best matches the card, so every card is an "oh, that window!" moment,
while the shared chrome (frame, title bar, buttons, bevels, Tahoma) keeps the set looking like one theme.

### Non-goals
- No new data or GitHub requests. A win98 card must make exactly the same fetches as the terminal card
  (offline fixtures replay by request key, and server load must not change).
- No Microsoft logos / Windows flag / trademarked artwork. Imitate window chrome and colors only.
- No embedded fonts. Use system fonts (`Tahoma, 'MS Sans Serif', 'Segoe UI', Geneva, sans-serif`).
- The existing themes' output must not change (existing snapshots stay byte-identical).

### Anti-goals (fails even if it "works")
- Looking like a generic grey web form rather than Windows 98 (wrong bevels, rounded corners, gradients
  other than the navy title bar).
- Text overflowing its control, overlapping, or clipped mid-glyph. Long names must be truncated with `…`.

## Look (the shared kit, `src/win98/kit.js`)
- Palette: face `#c0c0c0`, light `#dfdfdf`, highlight `#ffffff`, shadow `#808080`, dark `#000000`,
  title gradient `#000080 → #1084d0`, inactive title `#808080 → #b5b5b5`, desktop `#008080`,
  selection `#000080` with white text, tooltip `#ffffe1`.
- Bevels: raised = white top/left + black bottom/right + inner grey bottom/right; sunken = the inverse
  (grey/black top-left, white bottom-right). No rounded corners anywhere.
- Window: 2px raised outer frame, 18–22px title bar with 16px icon, bold white 12px title, right-aligned
  14×12 caption buttons (`_ □ ×` or `? ×`). Client area `#c0c0c0`.
- Text: 12px Tahoma for labels; 11px for dense lists; bold 12px for titles.
- Canvas: the window sits at (20,20) on a transparent SVG like the other cards (dashboard is the
  exception: a full teal desktop). Respect `scale` exactly like the other cards (output width/height ×
  scale, viewBox unchanged).
- Motion: subtle, one-shot (progress blocks filling, defrag cells appearing, list rows appearing).
  Everything must also render complete under `prefers-reduced-motion: reduce`.

## Per-card windows

| type | Window | Content mapping |
|---|---|---|
| stats | **Properties dialog** "GitHub Properties - {user}" with tabs Stats / Languages / Streak / Activity | left teal icon panel (monitor icon + "GITHUB STATS" + @user), group box "GitHub Statistics" with 6 sunken value fields in two columns, "Activity:" blue block progress bar = contributions, OK / Cancel / Apply |
| graph | **Disk Defragmenter** | sunken white grid of 52×7 cells; level 0 = white, levels 1–3 = blues like defrag's (`#7f7fff`? pick a 3-step blue ramp), legend row of swatches (Less → More), month labels, "1,824 contributions in the last year", progress bar + Stop / Pause / Legend / Hide Details buttons |
| top-lang | **Drive Properties (General tab)** | drive icon + label, list of languages each with a colour swatch and %, a 3D pie (ellipse + extruded rim) of the shares, "Capacity" style total line |
| streak | **Date/Time Properties** | month calendar of the current month with streak days selected (navy), total contributions + current streak + longest streak with their date ranges in a group box, an analog-style clock face optional |
| git-log | **Explorer, Details view** "Recent Commits - Exploring" | menu bar, toolbar row, list view with column headers Hash / Message / Repository / Date, one row per commit with a small document icon, status bar "8 object(s)" |
| pr-issue | **Outlook Express Inbox** | folder pane (Inbox / Outbox / Sent Items…) on the left, message list with columns ! / type icon / Repository / Subject / Date; merged / open / closed / draft shown via icon colour; status bar "8 message(s), 73 total" |
| repo | **Folder Properties** | big folder icon + repo name, rows Type / Location / Language / License / Branch / Release / Pushed / Open issues, stars/forks/watch line, topics as text, commit activity as a small sunken bar chart |
| lang-history | **System Monitor** | one horizontal stacked bar per year inside a sunken chart area, legend, "biggest mover" in the status bar |
| dashboard | **Desktop** | teal desktop, taskbar with Start button + clock, 2–3 small windows (profile, stats, mini graph) arranged like an open desktop |
| neofetch | **System Properties, General tab** | left: the avatar art the card already computes; right: "System:", "Registered to:", "Computer:" blocks filled with the neofetch fields |
| skills | **Control Panel, Large Icons view** | grid of the requested skill icons with captions; unknown icons listed in the status bar |
| ascii | **Paint** | tool box on the left, colour palette at the bottom, canvas showing the ASCII avatar the card already computes |
| error | **Error message box** | red circle-X icon, message text wrapped, OK button |

The builder of each card decides exact coordinates/sizes; keep sizes in the same range as the
terminal version of that card.

## Integration
- `THEMES.win98` exists (so validation, `palette` lookups and the builder accept it) with `kind: "win98"`
  and a palette mapping reasonable colours, plus the usual fields so nothing that reads them crashes.
- Each `generate*Svg` fetches data exactly as today and, when `themeName === "win98"`, returns
  `renderWin98<Card>(data, { githubId, scale, ...options })` from `src/win98/<card>.js` before doing any
  terminal layout. Terminal code paths stay untouched.
- Error card: `generateErrorSvg("win98", …)` renders the message box.
- Builder page: add the `win98` radio; the hash-restore regex must allow digits.
- README: add win98 to the themes list with one example.

## Testing
- Snapshot test `<type>-win98` for every card (+ `error-win98`) using the existing fixtures (no
  re-recording; if a fetch key is missing the card is making a new request, which is a bug).
- Existing snapshots must not change.
- Visual check: render every win98 snapshot to PNG with headless Chrome and inspect for overflow,
  overlap and authenticity.
