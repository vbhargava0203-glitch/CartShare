# CartShare

**One cart. Every roommate. Zero backtracking.**

CartShare turns chaotic group shopping — the WhatsApp threads, the sticky
notes, the "wait, did anyone add milk?" — into one live, shared cart with
a real-time activity log and an audit-ready printable receipt.

Built for the *"CartShare" Challenge* project brief: evolving a static
frontend prototype into a collaborative, real-time web application.

---

## ✅ What's implemented

| Brief requirement | How CartShare does it |
|---|---|
| Create / join a Room with a code | `index.html` generates a unique 6-character room code on **Create Room**, or validates one on **Join Room**. |
| Shared cart that updates for everyone in the room | Cart data is written to `localStorage`; a `storage` event listener re-renders every other open tab the instant a change happens. |
| Real-time activity log | Every join, add, remove, and leave is timestamped and streamed into the **Live activity** panel (newest first, `aria-live` for screen readers). |
| Audit-ready, printable receipt | **Print / generate receipt** builds an itemized receipt (subtotal, free-delivery status, equal split, per-person contribution, audit ID) and opens the browser print dialog via a dedicated `@media print` stylesheet. |
| User Access — HTML forms + JS | `index.html` / `js/login.js` handle name entry and room creation/joining. |
| Responsive UI — Flexbox, Grid, Bootstrap | Bootstrap is used for its responsive reset/utility layer; layout itself uses CSS Grid (page shell) and Flexbox (component-level) with breakpoints at 900px and 560px. |
| Data persistence — browser storage | `localStorage` keeps every room's cart alive across refreshes and new tabs. |
| Collaboration — event listeners across tabs | `window.addEventListener("storage", …)` in `js/app.js` syncs state across tabs/windows without a backend. |
| Printing — CSS print rules + JS | `.receipt-sheet` is hidden on screen and shown only under `@media print`; `js/app.js` populates it right before `window.print()`. |

### A step further than the brief

- **Fair-split transparency**: the receipt shows both an equal split *and*
  a per-person breakdown of what each roommate actually added, directly
  answering the brief's "hard to split expenses fairly" problem.
- **Free-delivery progress bar**: a live progress bar against the $75
  threshold, so the group can see in real time how close they are.

---

## 📁 Folder structure

```
CartShare/
├── index.html          # Landing page — Create Room / Join Room
├── room.html            # Main app — shared cart, activity, receipt
├── css/
│   └── style.css        # All styles: layout, components, print rules
├── js/
│   ├── storage.js        # Data layer (rooms, cart, activity, identity)
│   ├── login.js           # index.html logic
│   └── app.js              # room.html logic + cross-tab sync
├── assets/
│   └── logo.svg          # Brand mark / favicon
└── README.md
```

This matches the `css/`, `js/`, `assets/` organization required by the
course syllabus.

---

## ▶️ Running it locally

No build step, no dependencies to install — it's plain HTML/CSS/JS.

1. Download or clone this folder.
2. Open `index.html` directly in a browser, **or** serve it locally
   (recommended, some browsers restrict storage on `file://`):
   ```bash
   # from inside the CartShare/ folder
   python3 -m http.server 8000
   # then visit http://localhost:8000
   ```
3. Create a room, then open a **second tab** (or an incognito window)
   at the same local address, join the room with the same code but a
   different name, and add/remove items — watch both tabs update live.

> Bootstrap and the Google Fonts used (Space Grotesk, IBM Plex Mono, IBM
> Plex Sans) load from CDNs, so an internet connection is needed for the
> intended look. The app still functions fully offline; it just falls
> back to system fonts.

---

## 🖥️ Simulating multiple users (for grading/demo)

Since there's no backend, "real-time" collaboration is simulated with
`localStorage` (shared across tabs of the same browser on the same
machine) plus the `storage` event (fires in every *other* tab):

1. Open the app in **Tab A**, create a room as "Priya".
2. Open the app in **Tab B** (or an incognito window), join the same
   room code as "Sam".
3. Add an item in Tab B — Tab A's cart, activity log, and threshold
   bar update within the same second, with no page refresh.

---

### Live

- GitHub repository link: https://github.com/vbhargava0203-glitch/CartShare
- Live deployment URL: https://cartshareweb.netlify.app/

---

## 🧠 Design notes

The visual language is built around the product's own payoff — a shared
receipt — using a paper background, a torn-edge "ticket" card for
room access, and a monospace type (IBM Plex Mono) for room codes, prices,
and the printed receipt itself, paired with Space Grotesk for headings
and IBM Plex Sans for body text.
