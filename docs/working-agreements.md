# Working Agreements — disciplines for building this app

These survive compaction/`/clear`. Any agent continuing this work follows them **verbatim**.

## Debugging & honesty
- **Make no assumptions.** Verify against the code, the running app, or a test — never guess.
- **Do not blame the internet connection or model variants for any issue.** The cause is in the code or the setup.
- **Chase every bug to its root cause.** No band-aids, no "probably." Reproduce → minimise → fix the actual cause.
- Report outcomes faithfully: if a test fails, say so with the output.

## TDD (from the `/tdd` skill — applied to every piece of real logic)
- **Red → Green → Refactor, one test at a time.** Vertical tracer-bullet slices, never horizontal (do NOT write all tests then all code).
- One test → minimal code to pass → next test. Only enough code for the current test; no speculative features.
- **Test behavior through public interfaces, not implementation details.** A test should survive an internal refactor.
- **Never refactor while red.** Get to green first, then refactor with tests passing.
- Mirror the style of `src/lib/vcard.test.ts` (vitest, pure in/out assertions, explicit null/empty cases).

## QA
- **Use the Playwright MCP to QA as we go, and build a durable QA test for what we verify** (React Testing Library component tests in `npm test`, so the behavior is guarded on every run — not just the one live check).
- Browser QA is **not headless** — we watch the interaction live in Playwright.
- For camera work: also **scan with a real phone over the `npm run share` tunnel to prove it works** on real hardware. Playwright QA is necessary but not sufficient for the camera path.

## Domain & docs
- Use the glossary in `CONTEXT.md` (Attendee, Vendor, Badge, Scan, Lead, Export) in code, tests, and UI. **Lead**, not "Contact".
- Respect the ADRs: `docs/adr/0001` (vCard 3.0 payload), `docs/adr/0002` (dedup Leads by normalized email).
- Keep PRD, issues, QA sessions, and handoffs as **local markdown in `docs/`** — no GitHub/issue-tracker integration for this project.
