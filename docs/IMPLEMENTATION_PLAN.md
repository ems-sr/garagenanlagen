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

- [x] Stage 1 — done: Better Auth (email/password, organization+teams, admin,
      first-cut dynamic access control) wired against Postgres directly via
      `pg.Pool` (not the Prisma Next contract — its `db.orm` client isn't
      shape-compatible with Better Auth's `prismaAdapter`); `VereinProfile`
      and `Garagenanlage` domain models added to `prisma/contract.prisma`
      with plain indexed `organizationId` columns (no cross-system Prisma
      relation); protected `(app)` route group with sign-in/sign-up,
      dashboard, org-switch, and an Anlage-switcher stub. Verified end-to-end
      (sign-up, session, middleware redirect, org creation, `hasPermission`
      against custom `garage`/`invoice` statements, domain CRUD via
      `db.orm.public.Garagenanlage` — note the namespaced accessor is
      required here even though the contract has a single namespace).
- [x] Stage 2 — done: renamed Stage 1's German model names to English
      (`VereinProfile` → `ClubProfile`, `Garagenanlage` → `Facility`) per the
      architectural-decisions section, since Stage 2 introduced enough new
      models that a permanent German/English split would have set a bad
      precedent; added the structural hierarchy (`ConstructionSection`,
      `Block`, `Garage` with a flexible, denormalized-to-facility parent),
      membership core (`ClubMember` — not `Member`, since Better Auth already
      owns a lowercase `member` table and Prisma Next lowercases model names
      to table names, a collision only caught via a failed migration during
      authoring — plus `MembershipPeriod`), the two non-member party types
      (`GarageUser`, `Tenant`), and `GarageAssignment` (`member`/`user`/
      `tenant` — no "owner" type: a garage is administratively assigned to a
      club member, not legally owned; `user` records a member handing actual
      use to someone else as an independent second row, `tenant` bypasses the
      member layer entirely for direct club-to-non-member rentals, and the
      two are mutually exclusive per garage, enforced via DB-lookup business
      rules in the route handlers). Full REST CRUD + zod validation
      (German user-facing messages) for all of the above under `app/api/`,
      gated by Stage 1's existing `garage`/`member` `ac` statements (no new
      statements added). Backend-only per user decision — no new UI screens
      (Stage 3 adds Mitgliederverwaltung UI) — except wiring the existing
      Anlage-switcher stub to real `Facility` data via a `selected-facility`
      cookie (`components/facility-switcher.tsx`, renamed from
      `anlage-switcher.tsx`), since that was a hard prerequisite the stub's
      own comment already called out. `prisma/seed.ts` authored (was
      referenced by `package.json` but didn't exist). Verified end-to-end via
      curl against `pnpm dev`: flexible-parent rule on `Garage`, the
      discriminated-union + cross-type business rules on
      `GarageAssignment` (400/409 on every violation), duplicate
      `(facilityId, number)` → 409, unauthenticated → 401, `Restrict`-FK
      deletes → clean 409 (not a raw 500 — fixed during verification via a
      shared `isForeignKeyViolation` helper), `Cascade`-FK deletes actually
      cascade, and the facility-switcher renders real facility names and
      persists the cookie.
- [ ] Stage 3–15 — not started
