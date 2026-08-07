# Garagenverwaltung — Multi-Stage Implementation Roadmap

This is the living, multi-stage implementation plan requested by `docs/Projektbeschreibung.txt` ("Erstelle zunächst einen mehrstufigen Plan zur Umsetzung. Schreibe für den Plan in eine Datei innerhalb des Projektordners."). Stages build on each other; each is implemented and reviewed before the next begins.

## Architectural decisions carried across all stages

- **Better Auth `Organization` = Verein** (club/operator). A user can belong to more than one organization (rare, but supported) and switch between them via Better Auth's own org-switch flow.
- **Better Auth `Team` = functional group of users within one Verein** (e.g. "Vorstand", "Werkstatt-Team"), not one team per Garagenanlage.
- **`Garagenanlage`** is a plain domain model with an `organizationId` FK — a Verein can operate multiple Garagenanlagen. Switching the *active Anlage* in the UI is an app-level concept (selected-Anlage cookie), separate from Better Auth's org-switch.
- Prefer relational tables over JSON/array columns (per spec mandate) — e.g. `VereinProfile` is its own table rather than living in `Organization.metadata`.
- English table/field names, Prisma Next contract-first modeling, zod validation client+server, REST API for all domain functions, Preact Signals preferred over `useState`/`useMemo`, uploaded files as DB BLOBs, no Vercel-specific APIs (non-Vercel hosting target).

## Stages

1. **Stage 1 — Foundation.** Better Auth (email/password, Organization+Teams, Admin, first-cut Dynamic Access Control), Prisma Next contract for auth tables + Verein/Garagenanlage stubs, protected app shell, Anlage-switcher placeholder.
2. **Stage 2 — Structural Hierarchy & Membership Core.** Bauabschnitt, Trakt, Garage (single/double flag, Stromzähler-Nr., flexible parent assignment to Anlage/Bauabschnitt/Trakt), Mitglied (address, contact, Mitgliedschaftszeiträume), Mitglied↔Garage assignment (Eigentümer/Nutzer/Mieter relationship types), Garagennutzer and Mieter as distinct party types. CRUD REST routes + zod schemas for all of the above.
3. **Stage 3 — Vereinsverwaltung Grundfunktionen.** Verein-Stammdaten (Vorstand, Bankverbindung, Kontakt) UI/API, full Mitgliederverwaltung UI (list/detail/edit), Mitglied↔Garage assignment UI, org-scoped RBAC enforcement extended across these screens.
4. **Stage 4 — Garagenverwaltung Grundfunktionen: consumption billing core.** Zählerstände (meter readings) entry with date, price/kWh billing engine (since last reading), single and bulk invoice generation (19% VAT), open-invoice list, payment tracking/reconciliation.
5. **Stage 5 — Vereinsverwaltung Erweiterte Funktionen I: Beitragsverwaltung & Rechnungswesen.** Mitgliedsbeitrag accounts/ledgers, invoicing engine generalized beyond consumption billing (dues + custom line items, 19% VAT), open-item tracking shared with Stage 4's billing core.
6. **Stage 6 — Correspondence & Email.** SMTP integration, email templates, per-member/per-Anlage correspondence history log.
7. **Stage 7 — Reporting & Document Management.** Report generation incl. PDF export (member lists, financial reports, invoice runs), simple document management as DB BLOBs.
8. **Stage 8 — Arbeitseinsatz (Work Shifts).** Shift definition, participant lists, reimbursement calculation, optimal banknote-denomination breakdown for cash payout.
9. **Stage 9 — Garage properties & custom attributes.** User-defined equipment attribute types modeled as relational tables, attribute assignment per garage, garage usage-history log.
10. **Stage 10 — Garagenverwaltung Erweiterte Funktionen I: Mieterverwaltung.** Non-member renter management, renter-specific invoicing tie-in to Stage 4/5 billing.
11. **Stage 11 — Meter-reading photo OCR & member self-service.** Photo upload (BLOB) + OCR extraction of meter values, member self-service reporting flow with staff manual-confirmation workflow.
12. **Stage 12 — Damage tracking.** Damage records for individual garages and for the Anlage as a whole, photo documentation, damage reports.
13. **Stage 13 — Digital SVG map.** SVG overlay over OpenStreetMap per Garagenanlage, clickable garages linking into detail views, map-authoring/admin tooling.
14. **Stage 14 — RBAC/Dynamic Access Control hardening & REST API completeness pass.** Full resource/action permission matrix across all modules, audit all mutation routes, fill in any REST gaps, API documentation pass.
15. **Stage 15 — Non-Vercel hosting hardening & polish.** Verify no Vercel-specific APIs, production secrets/rate-limiting checklist, background-task wiring for the target host, Preact Signals usage audit, German i18n/accessibility pass.

## Status

- [x] Stage 1 — in progress (see current session)
- [ ] Stage 2–15 — not started
