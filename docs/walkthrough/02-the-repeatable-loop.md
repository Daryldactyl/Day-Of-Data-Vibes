# 02 · The repeatable loop

← [Ideation & spec](01-ideation-and-spec.md) · Next: [Journey 1 — Scan →](03-feature-scan.md)

---

This is the entire method. Every feature in this app — Scan, Export, Badge Generator — went through the **same
eight steps**. Learn it once here; the feature chapters just show it happening with real artifacts.

```
spec ─► /grill-with-docs ─► ADRs + glossary ─► /to-prd ─► /to-issues (slices)
     ─► /handoff ─► /tdd ─► Playwright QA (+ real device) ─► commit ─► deploy
```

Each named `/step` is a **skill** — a packaged expert prompt you invoke with a slash. The point of the loop is
to keep every individual task small and well-specified, so the AI stays in the "smart zone" and never has to
hold the whole app in its head at once.

## 1 · `/grill-with-docs` — align before you build

The AI interviews you **one question at a time**, walking the decision tree, and *recommends an answer to each*
— you steer. It resolves the spec's open ambiguities, sharpens fuzzy words into a glossary, and — most
importantly — **surfaces conflicts instead of letting them drift.** In the Scan journey you'll see it catch a
decision that directly contradicted the written spec and flag it as a *deliberate reversal*, not a silent one.

The raw transcript of each grill is kept verbatim (`docs/qa-sessions/`), so the *why* behind every decision
survives even after the summary lands in an ADR.

## 2 · ADRs + glossary — record what's expensive to change

Not every decision needs a record. An **ADR** (Architecture Decision Record, `docs/adr/`) is written only when
a choice is **hard to reverse, surprising without context, and a real trade-off**. Three earned one here
(vCard payload, email dedup, the Export hand-off). The glossary ([`CONTEXT.md`](../../CONTEXT.md)) is updated
*inline* the moment a term is pinned down. Cheap, reversible UI choices get noted in the grill and skipped for
an ADR.

## 3 · `/to-prd` — crystallize the destination

The grill becomes a one-page **PRD** (`docs/prd/`): problem → solution → user stories → implementation
decisions → testing decisions → out-of-scope. You skim it to confirm the AI heard you. It's the contract for
what "done" means.

## 4 · `/to-issues` — slice into tracer bullets

The PRD is cut into **vertical slices** — *tracer bullets*. A tracer bullet is a thin thread that goes through
**every layer** (logic → UI → test) and is **demoable on its own**. Not "all the plumbing, then all the UI" —
that's a horizontal slice and it hides integration risk until the end. Each issue (`docs/issues/`, numbered
`0001`+) is independently grabbable and carries its own acceptance criteria.

## 5 · `/handoff` — a fresh-context brief per slice

Because a long context degrades quality, each slice gets a **hand-off** (`docs/handoffs/`): a self-contained
brief a *fresh* agent can pick up cold — what's already done, the exact change, the TDD cycle list, what *not*
to touch, and the live QA the orchestrator will run. This is what makes it safe to clear context between slices
(and to dispatch slices to subagents — see below).

## 6 · `/tdd` — red → green → refactor, one test at a time

The real logic is built **test-first**: a tiny failing test (red) → just enough code to pass (green) → refactor
with the test green. One test at a time, never "write all the tests then all the code." Tests assert *behavior
through public interfaces*, so they survive refactors. The failing test is a precise target the AI can't
wriggle around — it makes cheating hard. Every feature here started with a **pure function** under test
(`addLead`, `toCsv`, `isValidBadgeInput`) before any UI glue.

## 7 · Playwright MCP QA — drive the real app, then lock it in

A unit test proves the logic; it can't prove the *app* works. **Playwright MCP** lets an agent open the running
app in a real browser and exercise it like a user — then **whatever it verifies becomes a durable test** so
it's guarded on every run, not just once. For anything the browser can't fully simulate (the camera, a phone's
share sheet), you also test on a **real device** over the `npm run share` tunnel. This combination is the theme
of the [bug-hunts chapter](06-lessons-and-bug-hunts.md): Playwright is *necessary but not sufficient.*

## 8 · commit → deploy

Each verified slice is committed; the finished app is deployed to a real HTTPS URL (Cloudflare Pages, via
`npm run deploy`) — CDN-hosted, not a tunnel, so it works whether or not any laptop is on.

---

## The disciplines that run underneath

From [`working-agreements.md`](../working-agreements.md) — the rules that survive every context reset:

- **Make no assumptions. Chase every bug to its root cause.** No band-aids, no "probably." Reproduce →
  minimize → fix the actual cause. (The Export bug hunt is the clinic for this.)
- **Durable tests *and* live QA.** The Playwright check is necessary; the test it becomes is what lasts.
- **Dispatch slices to fresh subagents, then independently inspect.** Several slices here were built by a
  subagent working from a hand-off — and then *re-verified by the orchestrator*: re-run the suite, re-read the
  code, drive the live QA. **Never trust the report alone.** (You'll see this in the issue bodies:
  *"Implemented by a subagent… independently inspected."*)
- **Report faithfully.** If a test fails, say so with the output.

---

Now watch it happen for real. Next: **[03 · Journey 1 — Scan & Collect Leads →](03-feature-scan.md)**.
