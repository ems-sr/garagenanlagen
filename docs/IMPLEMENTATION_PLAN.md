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
- [x] Stage 3 — done: `ClubProfile` expanded from its Stage 1 stub with
      Anschrift (`street`/`postalCode`/`city`) and full Bankverbindung
      (`bankIban`/`bankBic`/`bankName`/`accountHolder`) fields; new
      `BoardMember` model added as standalone person records (fullName,
      role, email, phone) — not FK'd to `ClubMember`, per user decision,
      since board membership isn't enforced against club membership at the
      schema level. New `club: ['read', 'update']` Better Auth AC statement
      (separate from `member`, so Vereins-Stammdaten and Mitgliederverwaltung
      permissions can be granted independently), wired into `owner`,
      `admin`, `member`, and the seeded `vorstand` role. REST API added:
      `app/api/club-profile` (GET/PATCH, upserts the one-row-per-org
      profile) and `app/api/board-members` (+`[id]`, full CRUD) — same
      `getRequestContext`/`requirePermission`/zod/German-error-message
      pattern as Stage 2. No new routes needed for Mitgliederverwaltung or
      Mitglied↔Garage assignment; Stage 2's `app/api/members/**` and
      `app/api/garage-assignments/**` are reused as-is by the new UI.
      First real UI screens shipped (Stage 1/2 had only a dashboard stub
      and the facility-switcher): `/verein` (Stammdaten form + Vorstand
      table with add/edit/delete dialogs, RBAC-gated via a server-side
      `hasPermission` check passed down as `canEdit`), `/mitglieder` (list
      with client-side search + active/inactive badge derived from
      `MembershipPeriod`), `/mitglieder/neu` and
      `/mitglieder/[id]/bearbeiten` (create/edit forms), and
      `/mitglieder/[id]` (detail: profile, membership-period history with
      add/end, and garage assignments with an assign-garage dialog +
      end-assignment button). Added shadcn `table`/`dialog`/`alert-dialog`/
      `textarea`/`badge`/`tabs` components (no `form` component exists for
      this project's Base UI style — forms use the existing `Field`/
      `FieldGroup` primitives, matching the sign-in/sign-up page pattern).
      Migration applied via the formal `migration plan`/`migrate` path, not
      `db update` — the `db` ref had gone stale after Stage 2 (pointed at
      the Stage 1 baseline hash instead of the graph tip), which made a
      first `migration plan` attempt misfire as a full destructive
      recreate; realigned the ref to the graph tip
      (`prisma-next ref set db <hash>`) before re-planning, which produced
      the correct 8-operation additive-only migration. Verified end-to-end
      via `pnpm run lint`, `tsc --noEmit`, and a full `pnpm dev` run
      driven with `curl` against a throwaway org/user/member/garage (RBAC
      CRUD across `club-profile`/`board-members`/`members`/
      `membership-periods`/`facilities`/`garages`/`garage-assignments`, and
      all five new pages rendering 200 with correct data) — caught and
      fixed one bug in the process: the member-detail Server Component
      imported a Phosphor icon directly, which crashed RSC rendering
      (`createContext is not a function`) because the icon package expects
      a Client Component boundary; fixed by dropping the icon from the
      server-rendered button. All test data cleaned up from the dev
      database afterward.
- [x] Stage 4 — done: consumption billing core. New contract models
      `PricePerKwh` (effective-dated, per Facility), `MeterReading`,
      `Invoice`, `Payment` (+ `InvoiceStatus` enum) — all money fields
      (`pricePerKwh`, `netAmount`/`vatAmount`/`grossAmount`, `Payment.amount`)
      are `Int` cents per explicit user decision, not `Decimal`, for exact
      arithmetic; only the physical kWh quantities (`MeterReading.value`,
      `Invoice.consumptionKwh`) stay `Decimal`. New `meterReading`
      Better Auth AC statement (kept separate from the existing `invoice`
      statement so meter-entry and billing/payment permissions can be
      granted independently), wired into `owner`/`admin`/`vorstand` (full)
      and `member` (read). Billing engine in `lib/billing/`
      (`generateInvoiceForReading`, `generateBulkInvoicesForFacility`,
      `recordPayment`) computes consumption since the last reading for a
      garage, resolves the effective price and the active `member`-type
      `GarageAssignment` to bill (Tenant/renter billing is Stage 10 scope),
      and generates a sequential `RE-{year}-{seq}` invoice number per
      transaction; partial payments are supported and an invoice flips to
      `paid` once payments cover `grossAmount`.
      **API pattern clarified with the user and now the standing rule**:
      Server Actions (`app/(app)/_actions/**`) are for mutations,
      REST routes are for reads, and — per explicit instruction —
      REST routes must always exist for every domain function regardless
      (for later external use), correcting Stage 2/3's undocumented drift
      to Server-Actions-only for members/garage-assignments/club-profile/
      board-members (not retrofitted this stage). Stage 4 therefore ships
      full REST CRUD under `app/api/price-per-kwh`, `app/api/meter-readings`,
      `app/api/invoices` (+`/bulk`, +`/[id]/payments`), all calling the same
      `lib/billing/*`/`lib/validation/*` functions as the Server Actions
      used by the UI — no duplicated business logic between the two lanes.
      UI: a "Strompreise" tab on the facility detail page
      (`/garagenanlagen/[id]`); the garage page (`/garagen/[garageId]`,
      previously an edit-only form) converted to a Stammdaten/Zählerstände
      tabbed view, the new tab listing readings with an inline
      "Rechnung erzeugen" action; new `/rechnungen` (facility-scoped via
      the existing `selected-facility` cookie, status filter, bulk-generate
      button) and `/rechnungen/[id]` (full breakdown, payment history,
      cancel-if-unpaid-and-no-payments) pages. Verified end-to-end via
      `pnpm run lint`, `tsc --noEmit`, and a `pnpm dev` + `curl` run against
      a throwaway org (no interactive browser available in this session, so
      the new pages were instead verified by inspecting their rendered SSR
      HTML for the expected content): consumption/VAT math and sequential
      invoice numbering, re-invoicing the same reading rejected cleanly,
      bulk generation across garages with mixed billable state (skips
      reported per-garage, not a batch failure), partial-then-full payment
      correctly flipping status to `paid`, cancel blocked on a paid invoice,
      RBAC 403 for a read-only role vs 200 on read, 401 unauthenticated —
      caught and fixed one bug in the process: `.count()` on a filtered
      collection threw `ORM.INCLUDE_INVALID` at runtime (contrary to the
      Prisma Next skill's own docs, which list it as a plain terminal verb
      alongside `.all()`/`.first()`), worked around by using `.all().length`
      for the invoice-numbering sequence query. All test data cleaned up
      from the dev database afterward.
- [x] Stage 5 — done: generalized invoicing beyond consumption billing.
      `Invoice` gained a `type` enum (`consumption`/`membershipFee`/`custom`,
      `@default(consumption)` for backward compatibility) and its
      facility/garage/reading/kWh/price fields were widened to nullable —
      only `type=consumption` populates them, matching Stage 4's shape
      unchanged; `membershipFee`/`custom` invoices are club-level (no
      facility) and carry their amount as new `InvoiceLineItem` rows
      (description/quantity/unitPrice/netAmount) instead, with a free-text
      `description` on the invoice itself. New `MembershipFee` model
      (effective-dated Beitragssatz, club-wide like `PricePerKwh` but not
      per-Facility) rounds out the contract additions. New `membershipFee`
      Better Auth AC statement for rate maintenance (mirrors Stage 4's
      `meterReading`/`invoice` split: setting the rate is separately
      gated from generating/canceling invoices, which stays on the
      existing `invoice` statement — no new statement needed there since
      dues/custom invoicing reuses Stage 4's open-item machinery
      end-to-end). Billing engine additions in `lib/billing/`:
      `generateMembershipFeeInvoiceForMember` (bills one member for
      `[periodStart, periodEnd)`, rejecting a second invoice for the same
      member+period via an application-level lookup — no DB constraint,
      mirroring how Stage 4 checks `currentReadingId` up front),
      `generateBulkMembershipFeeInvoices` (bills every `ClubMember` with a
      `MembershipPeriod` overlapping the period, skipping — not failing —
      members without one), and `generateCustomInvoice` (arbitrary line
      items, net/vat/gross summed from them). All three, plus Stage 4's
      `generateInvoiceForReading`, now share one `nextInvoiceNumber`
      helper (extracted to `lib/billing/invoice-number.ts`) so
      `RE-{year}-{seq}` stays one gap-free sequence per organization per
      year across every invoice type, not per type — verified via curl
      (numbers landed 0001/0002/0003 across a dues/dues/custom sequence
      in the same run). `recordPayment`/cancel-invoice logic needed no
      changes at all: both already operated on `Invoice`/`Payment` without
      assuming consumption fields, so Stage 5's open-item tracking is
      Stage 4's unmodified, confirming the "shared open-item tracking"
      requirement fell out of the existing design rather than needing new
      code. REST API: `app/api/membership-fees` (+`[id]`, full CRUD,
      mirrors `price-per-kwh`'s shape exactly) and
      `app/api/invoices/membership-fee` (+`/bulk`),
      `app/api/invoices/custom`, `app/api/invoices/[id]/line-items` (GET
      only — line items are billing-engine-created, never hand-edited,
      same rationale as Invoice's own lack of free-form create). Server
      Actions mirror the REST surface per the Stage 4 pattern
      (`_actions/membership-fees.ts`, three new functions added to
      `_actions/invoices.ts`). UI: new "Mitgliedsbeiträge" tab on
      `/verein` (`MembershipFeeManager`, copy of `PricePerKwhManager`
      minus the per-facility scoping); `/rechnungen` now queries
      organization-wide and filters client-side to "this facility's
      consumption invoices + every club-wide dues/custom invoice"
      (`!invoice.facilityId || invoice.facilityId === facilityId` — no
      `or()` combinator available in the query builder, same workaround
      Stage 4 used for price/assignment lookups), gained a Typ column, and
      `InvoiceList` gained two dialogs (bulk Beitragsrechnungen by period;
      free-form Rechnung with dynamic line-item rows) alongside the
      existing bulk-consumption button; `/rechnungen/[id]` branches on
      `invoice.type` — the Stage 4 Zählerstand/kWh breakdown is untouched
      for `consumption`, a new line-item table + totals renders for
      `membershipFee`/`custom`; `PaymentManager` is reused verbatim (it
      never assumed consumption fields either). Verified end-to-end via
      `pnpm run lint`, `tsc --noEmit`, and a `pnpm dev` + curl run against
      a throwaway org/member (no interactive browser available in this
      session): fee-rate resolution at period start, dues net/VAT/gross
      math, duplicate-period rejection (single and inside a bulk run,
      correctly reported as skipped rather than failing the batch),
      bulk dues billing only active-`MembershipPeriod` members, custom
      invoice multi-line-item summation, shared invoice-number sequence
      across types, full payment flipping a dues/custom invoice to
      `paid` exactly like Stage 4's consumption invoices, cancel blocked
      on a paid invoice, 401 unauthenticated, and the `/verein` Beiträge
      tab and both new invoice-detail renderings (line-item table for
      membershipFee/custom, unchanged Zählerstand view for consumption)
      rendering their expected content in the SSR HTML. All test data
      cleaned up from the dev database afterward (including the Better
      Auth user/org rows the throwaway sign-up created, via a one-off
      script since Better Auth's tables sit outside `db.orm`).
- [x] Stage 6 — done: SMTP correspondence. New `nodemailer` dependency (no
      SMTP client existed yet); `lib/email/transport.ts` lazily builds and
      caches a transport from `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/
      `SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` env vars (added to `.env.example`),
      throwing a clear message when unconfigured rather than letting
      nodemailer fail opaquely; `lib/email/send-email.ts` is the one
      low-level send point the whole app should route through;
      `lib/email/render-template.ts` does flat `{{key}}` substitution (no
      templating engine — only member fields are ever needed). Deliberately
      did **not** wire this into Better Auth's own transactional email
      (password reset): there's no forgot-password UI yet to trigger it, and
      the roadmap's Stage 6 scope is club correspondence, not auth UX —
      wiring a send path nothing calls would be a half-finished feature, not
      "SMTP integration" per se. New contract models: `EmailTemplate`
      (reusable subject/body pairs, organization-scoped, edited in place —
      not effective-dated like PricePerKwh/MembershipFee) and
      `CorrespondenceLog` (the "per-member/per-Anlage" history log the
      roadmap calls for: always tied to the `ClubMember` it was sent to,
      optionally tagged with the `Facility` a send was scoped to; stores the
      fully-rendered subject/body actually sent, not the template
      reference, so history stays correct after a template is edited or
      deleted — `templateId` is nullable with `onDelete: SetNull` so
      deleting a template can't be blocked by, or destroy, past history).
      New `correspondence` Better Auth AC statement — one statement for both
      template management and sending/viewing, unlike the meterReading/
      invoice or membershipFee/invoice splits from Stages 4/5, since there's
      no scenario here needing one without the other. Engine in
      `lib/email/send-correspondence.ts`: a single `sendCorrespondence`
      entry point handles all three recipient modes (`member` — one
      `ClubMember`; `allMembers` — every `ClubMember` in the org,
      intentionally unfiltered by active/inactive status since dunning
      correspondence to a lapsed member is a legitimate use case unlike
      billing; `facilityMembers` — every `ClubMember` with an active
      `member`-type `GarageAssignment` to a garage in the given `Facility`,
      giving the "per-Anlage" framing real targeting behavior, not just a
      log tag). Never wrapped in a transaction: a partial batch (some sent,
      some failed, some skipped for a missing email address) is the
      expected, useful outcome, matching Stage 4/5's bulk-generation
      skip-not-fail pattern — every attempted send gets a logged
      `CorrespondenceLog` row regardless of whether the SMTP call itself
      succeeded (`status: sent|failed`, with `errorMessage` on failure),
      only recipients with no email on file are skipped before an attempt
      is made. REST API: `app/api/email-templates` (+`[id]`, full CRUD) and
      `app/api/correspondence` (GET history with `clubMemberId`/`facilityId`
      filters, POST send) — same Server-Action-mirrors-REST pattern as
      Stages 4/5. UI: new `/korrespondenz` top-level nav page (Verlauf tab:
      org-wide log table + a `SendCorrespondenceDialog` with a recipient-
      mode picker; Vorlagen tab: `EmailTemplateManager`, copy of
      `BoardMemberManager`'s CRUD-dialog shape with a `Textarea` for the
      body and a placeholder-syntax hint); a new "Korrespondenz" tab on
      `/mitglieder/[id]` reusing the same two components in a
      `scope="fixedMember"` mode (recipient picker hidden, target locked to
      that member) — `SendCorrespondenceDialog`'s props are a discriminated
      union on `scope` (`'fixedMember' | 'org'`) so TypeScript actually
      enforces which fields each call site must pass, rather than an
      all-optional prop bag. Verified end-to-end via `pnpm run lint`,
      `tsc --noEmit`, and a `pnpm dev` + curl run against a throwaway org
      with one member with an email and one without (no interactive browser
      available in this session, no real SMTP credentials in this dev
      environment either): `{{firstName}}`/`{{lastName}}` placeholder
      substitution in both subject and body, single-member template send
      logged with `status=failed` and a clear "SMTP nicht konfiguriert"
      `errorMessage` (proving the graceful-degradation path rather than a
      500), bulk `allMembers` send producing one attempted log row plus one
      `NO_EMAIL`-skipped row, `facilityMembers` against a nonexistent
      facility → 404, missing subject/body/templateId → 400
      `VALIDATION_ERROR`, 401 unauthenticated, and both new page renderings
      (org-wide `/korrespondenz` history + Vorlagen, and the per-member
      Korrespondenz tab) showing the expected content in the SSR HTML.
      Also fixed a migration-authoring mistake caught during this stage:
      the first `migration plan` run defaulted `--from` to the `db` ref,
      which Stage 5 had applied via `migrate` but never advanced (a gap in
      Stage 5's own process) — so it silently replanned Stage 5's already-
      applied operations alongside Stage 6's new ones instead of just the
      delta; recovered by deleting the bad migration package, `ref set db`
      to the Stage 5 tip hash, and re-planning, which produced the correct
      11-operation additive-only migration (and the `db` ref was advanced
      to the new tip afterward this time, to avoid leaving the same trap
      for Stage 7). All test data cleaned up from the dev database
      afterward.
- [x] Stage 7 — done: PDF report generation + simple document management.
      New `Document` model (`prisma/contract.prisma`) — first binary column
      in this contract; `content Bytes` maps to Postgres `bytea` (verified
      by reading the installed `@prisma-next/target-postgres` package's
      field-preset table before authoring, since neither the `prisma-8`
      skill nor its bundled references mention `Bytes` at all — a gap worth
      flagging back to the Prisma Next team). Org-wide with independent
      optional `clubMemberId`/`facilityId` tags (`onDelete: SetNull`, same
      rationale as `CorrespondenceLog.templateId`), so a document can be
      filed under a member, a facility, both, or neither (Satzung,
      Protokolle). Deliberately **no** `ReportRun` audit-log model: unlike
      Stage 6's `CorrespondenceLog` (which freezes the outcome of a
      real side effect — an email actually sent), a PDF report has no side
      effect and is always re-derivable from current data, so logging "a
      report was generated" would be speculative scope with no consumer.
      New `report: ['read']` (generating a PDF is a read, no other verb
      applies) and `document: ['create', 'read', 'update', 'delete']`
      Better Auth AC statements, wired into `owner`/`admin` (full),
      `member` (read-only on both), and `vorstand` (full, matching its
      existing grants on `invoice`/`meterReading`/`membershipFee`/
      `correspondence`). New dependency: `@react-pdf/renderer` (pure-JS,
      React-component PDF generation — no headless-Chromium dependency,
      chosen specifically for the "non-Vercel hosting target" architectural
      constraint). Report engine in `lib/reports/*.ts`
      (`assembleMemberListReport`, `assembleFinancialReport`,
      `assembleInvoiceRunReport`) — read-only aggregations over existing
      `ClubMember`/`MembershipPeriod`/`GarageAssignment`/`Invoice`/
      `Payment`/`InvoiceLineItem` data, reusing the flat-fetch-then-JS-join
      query pattern from `/rechnungen` (still no `or()` combinator) and the
      `facilityMembers` targeting logic from Stage 6's
      `send-correspondence.ts`; PDF templates in `lib/pdf/*.tsx`. Reports
      are GET-only REST routes (`app/api/reports/{member-list,
      financial-report,invoice-run}`) returning `application/pdf` —
      no Server Actions at all for this half of the stage, since there is
      no mutation to wrap. Documents get the full REST CRUD +
      Server-Action-mirror pattern (`app/api/documents`, `+[id]`,
      `app/(app)/_actions/documents.ts`), with upload handled via the
      native Web `Request.formData()`/`File` API (no extra multipart
      dependency) and an explicit 20 MB size ceiling enforced in
      application code (Route Handlers have no framework-level body-size
      limit the way Server Actions do). The document list endpoint always
      strips `content` before returning JSON, so listing never balloons the
      response with BLOB data. UI: new `/berichte` nav entry (one page,
      four tabs — Mitgliederliste/Finanzbericht/Rechnungslauf/Dokumente —
      mirroring Stage 6's `/korrespondenz` Verlauf/Vorlagen shape),
      `ReportExportPanel` (one shared component parameterized by report
      kind rather than three near-duplicates) and `DocumentManager` (copy
      of `EmailTemplateManager`'s CRUD-dialog shape, plus a plain
      `<input type="file">` — no file-input or date-range shadcn component
      existed yet, and none was added; plain `<Input type="date">` pairs
      match the pattern already used for `MembershipPeriod`/`PricePerKwh`).
      No new shadcn components needed. Verified end-to-end via
      `pnpm run lint`, `tsc --noEmit`, and a `pnpm dev` + curl run against a
      throwaway org/user/member/facility/garage (no interactive browser
      available in this session): unauthenticated → 401 on every new
      route; a read-only `member`-role user got 200 on every read/download
      and 403 on upload/delete; all three report PDFs rendered correctly
      (`%PDF` header, correct page count) with net/VAT/gross totals and a
      payments-received total verified byte-for-byte against hand-computed
      fixture values (€35.00/€6.65/€41.65 consumption +
      €100.00/€19.00/€119.00 dues = €135.00/€25.65/€160.65 grand total,
      €119.00 collected) by extracting each PDF's text via `pdftotext`;
      Mitgliederliste correctly filtered by `activeOnly` and by
      `facilityId` (including the garage-number column that only appears
      once a facility filter is set); document upload/list/download/PATCH/
      DELETE all verified (tag filtering by `clubMemberId` and by
      `facilityId`, downloaded bytes diffed identical to the uploaded
      source file, list response confirmed to exclude `content`, oversized
      21 MB upload rejected with a clean 400 `FILE_TOO_LARGE` rather than a
      500/timeout); `/berichte` SSR HTML confirmed to render all four tabs.
      Caught and fixed two bugs in the process: (1) `NextResponse`'s
      `BodyInit` type didn't accept a Node `Buffer`/the `Bytea` codec's
      `Uint8Array<ArrayBufferLike>` output directly under this project's TS
      lib version — fixed by wrapping in `new Uint8Array(...)` at each of
      the four binary-response call sites; (2) confirmed that Prisma Next's
      single-row-affecting-verb caveat (already known for `.update()`, per
      Stage 4's `generate-invoice.ts` comment) applies to `.delete()` too —
      a first cleanup-script pass silently left every row but the first
      behind and tripped a foreign-key violation on the following table;
      fixed by using `.deleteAll()` throughout the cleanup script, worth
      remembering for any future ad hoc multi-row delete. All test data
      (org, both throwaway users, member, facility, garage, invoices,
      documents) cleaned up from the dev database afterward, including the
      Better Auth rows via a one-off script per the Stage 5+ pattern.
- [x] Stage 8 — done: Arbeitseinsatz (work shifts). Three new contract
      models: `WorkShiftReimbursementRate` (club-wide effective-dated
      Aufwandsentschädigung rate, `amountPerHour` in cents — same
      `validFrom`/`validTo` shape as `MembershipFee`/`PricePerKwh`),
      `WorkShift` (title/description/date/location, optional `facilityId`
      — a shift can be club-wide or scoped to one Facility, same
      optional-tag shape as Stage 7's `Document`), and `ShiftParticipant`
      (join row: `hoursWorked` Decimal, `reimbursementAmount` Int snapshot,
      `paidOut`/`paidOutAt` for a one-time full cash payout — no partial-
      payout concept, so no separate payment child table unlike
      `Invoice`/`Payment`). `@@unique([workShiftId, clubMemberId])` blocks
      double-adding a member to a shift at the DB level (mirrors
      `Invoice.currentReadingId`'s `@unique`) — caught at the route/action
      layer via a new `isUniqueViolation` helper (sqlState `23505`) added
      alongside `lib/api/responses.ts`'s existing `isForeignKeyViolation`,
      backing up a pre-check in `lib/work-shifts/add-participant.ts` for a
      friendly error message. New `workShift`/`workShiftRate` Better Auth
      AC statements (split the same way `meterReading`/`invoice` and
      `membershipFee`/`invoice` are — rate maintenance gated independently
      of day-to-day shift/participant/payout management), wired into
      `owner`/`admin`/`vorstand` (full) and `member` (read). Reimbursement
      logic in `lib/work-shifts/` resolves the rate effective on the
      shift's `date` (same `validFrom <= date && (!validTo || validTo >
      date)` JS-filter pattern `generate-invoice.ts` uses for
      `PricePerKwh` — still no `or()` combinator) and snapshots
      `reimbursementAmount = round(hoursWorked * amountPerHour)` at
      add-time, same snapshot-not-recompute reasoning as
      `Invoice.netAmount`; a later rate edit never touches past
      participants. New `lib/cash/denomination-breakdown.ts`: a pure,
      synchronous greedy function over the full standard EUR cash set
      (`€500` down to `1 Cent`, 15 denominations total) — greedy is
      provably optimal for this specific denomination set, per user
      decision to support banknotes *and* coins since `hours × rate`
      reimbursement won't generally land on a whole banknote. Deliberately
      not persisted: the breakdown is always re-derivable from the stored
      `reimbursementAmount`, same non-persistence reasoning Stage 7 used
      for PDF reports. REST API: `app/api/work-shifts` (+`[id]`, full
      CRUD), `app/api/work-shifts/[id]/participants` (+`[participantId]`,
      add/update/remove — POST wrapped in `db.transaction`, mirrors
      `app/api/invoices/[id]/payments`'s shape), a dedicated
      `.../participants/[participantId]/payout` POST route (records the
      payout and returns the breakdown alongside the updated row), and
      `app/api/work-shift-rates` (+`[id]`, mirrors `membership-fees`
      exactly). Server Actions mirror the full REST surface in
      `_actions/work-shifts.ts` and `_actions/work-shift-rates.ts`. UI: new
      `/arbeitseinsaetze` nav entry — list page (`WorkShiftManager`:
      date/title/facility/participant-count table + create dialog) and
      `/arbeitseinsaetze/[id]` detail page (`ShiftParticipantManager`:
      participant table with hours/reimbursement/paid-status, add-
      participant dialog, and a "Bar auszahlen" dialog rendering the
      denomination breakdown client-side via the same pure
      `breakdownIntoDenominations` function — no network round-trip needed
      for the preview — before calling the payout Server Action to
      confirm); new "Arbeitseinsatz-Vergütung" tab on `/verein`
      (`WorkShiftRateManager`, copy of `MembershipFeeManager` minus the
      `description` field) — rate maintenance lives alongside
      `Mitgliedsbeiträge`, same precedent as putting other club-wide rate
      management under `/verein` rather than a standalone nav entry. No
      new shadcn components needed (plain `<Input type="date">`/
      `type="number">`, existing `Select`/`Badge`/`Table`). Verified
      end-to-end via `pnpm run lint`, `tsc --noEmit`, and a `pnpm dev` +
      curl run against a throwaway org/member/facility (no interactive
      browser available in this session): `NO_RATE` error cleanly
      returned before any rate exists; reimbursement math verified by hand
      (3.5h × €12.37 → €43.30, 0.33h × €12.37 → €4.08, both matching
      `Math.round` exactly); duplicate participant add → clean 409, not a
      500; denomination breakdowns for both amounts verified to sum back
      to the exact reimbursement and use the minimum note/coin count
      (5 pieces each, including the odd-cent case exercising coins down to
      1 cent); payout flips `paidOut`/`paidOutAt` and blocks both a second
      payout and a post-payout hours edit with clean 409s; RBAC verified
      (401 unauthenticated, 403 for a read-only `member` role on every
      mutation, 200 on every read); `/arbeitseinsaetze` and
      `/arbeitseinsaetze/[id]` SSR HTML confirmed to render shift/
      participant data; the `/verein` Arbeitseinsatz-Vergütung tab trigger
      renders (its manager content isn't in the default-tab SSR HTML,
      since Base UI's `Tabs` only server-renders the active panel — a
      testing-methodology note, not a defect, confirmed instead via the
      REST JSON response). Also fixed a migration-authoring gap discovered
      at the start of this stage: Stage 7's `migrate` had applied cleanly
      but the `db` prisma-next ref was never advanced afterward (the same
      class of mistake caught and fixed in Stages 3 and 6) — caught by
      checking `migration status` before planning, fixed via
      `ref set db <tip-hash>` before this stage's `migration plan`, and
      the ref was advanced again immediately after this stage's `migrate`
      to avoid leaving the same trap for Stage 9 — `prisma-next migrate`
      confirmed to never auto-advance the `db` ref, so this is a
      standing manual step every stage's migration workflow must include,
      not a one-off slip. All test data (org, both throwaway users,
      2 members, facility, shift, participants, rate) cleaned up from the
      dev database afterward, including the Better Auth rows via a
      one-off script per the Stage 5+ pattern, remembering Stage 7's
      `.deleteAll()`-not-`.delete()` lesson for the multi-row cleanup.
- [x] Stage 9 — done: user-defined equipment attribute types + garage
      usage-history log. Three new contract models: `GarageAttributeType`
      (club-wide, like `MembershipFee`/`WorkShiftReimbursementRate`, not
      per-`Facility` like `PricePerKwh` — equipment categories are a
      club-wide concept — `name`/`dataType` enum (`text`/`number`/
      `boolean`)/optional `unit`, not effective-dated unlike the rate
      models), `GarageAttributeAssignment` (one value per
      (garage, attributeType) via `@@unique([garageId, attributeTypeId])`,
      same shape as `ShiftParticipant`'s uniqueness rule; `value` stored as
      raw `String` regardless of `dataType`, with `onDelete: Cascade` on
      both FKs — unlike the `SetNull` pattern on `Document`/
      `CorrespondenceLog`'s optional historical tags, an assignment value is
      meaningless without its garage or a defined type to interpret it by),
      and `GarageUsageEvent` (the roadmap-mandated "usage-history log" that
      `GarageAssignment`'s Stage 2 doc comment explicitly deferred to this
      stage — append-only, no `updatedAt`, same shape as
      `CorrespondenceLog`; `eventType` enum `assignmentStarted`/
      `assignmentEnded`/`note`, `clubMemberId` nullable with
      `onDelete: SetNull`). `GarageAssignment` itself remains the raw
      historical data (old rows keep `validTo` instead of being deleted,
      per its existing doc comment); `GarageUsageEvent` is the derived,
      human-readable event trail. New `garageAttribute` (create/read/
      update/delete, one statement for both type definitions and
      assignments — same rationale as Stage 6's `correspondence`) and
      `garageUsageEvent` (create/read only, no update/delete — append-only,
      matching `CorrespondenceLog`'s lack of an edit/delete API) Better Auth
      AC statements, wired into `owner`/`orgAdmin`/`vorstand` (full) and
      `orgMember` (read-only). `lib/garages/attribute-assignment.ts`'s
      `upsertAttributeAssignment` does dataType-specific value validation
      via a DB lookup of the attribute type (number must parse, boolean
      must be `'true'`/`'false'`) — same "business rule enforced outside
      the zod schema" split Stage 2 used for `GarageAssignment`'s
      cross-row rules, since the check needs the attribute type's row
      first. `lib/garages/usage-events.ts`'s `logGarageUsageEvent` is
      called directly from `app/(app)/_actions/garage-assignments.ts`'s
      existing `createGarageAssignment`/`endGarageAssignment` (not wrapped
      in the same transaction — a logged event is a side note on an
      already-committed fact, same "never wrapped in a transaction"
      reasoning Stage 6 used for `CorrespondenceLog`); `endGarageAssignment`
      only logs `assignmentEnded` when `validTo` actually transitions from
      null, not on every PATCH. REST API: `app/api/garage-attribute-types`
      (+`[id]`, full CRUD, mirrors `work-shift-rates`), nested
      `app/api/garages/[id]/attributes` (GET list, POST upsert) +
      `[attributeTypeId]` (DELETE, keyed by attribute type rather than
      assignment id since the composite (garage, attributeType) key is
      already the natural identifier), and
      `app/api/garages/[id]/usage-history` (GET list newest-first, POST
      manual note only — `assignmentStarted`/`assignmentEnded` are
      system-written, not exposed for direct creation). Server Actions
      mirror the full surface (`_actions/garage-attribute-types.ts`,
      `_actions/garage-attributes.ts`, `_actions/garage-usage-events.ts`).
      UI: garage detail page (`/garagen/[garageId]`) gained two tabs —
      Attribute (`GarageAttributeAssignmentManager`: one input per
      club-defined attribute type, rendered per `dataType` — text/number
      input or a Ja/Nein `Select`, no new shadcn Checkbox component added,
      matching Stage 7/8's precedent of reusing existing form primitives
      over adding new ones — upsert-on-save, with a "Wert entfernen" action
      once a value exists) and Nutzungsverlauf (`GarageUsageHistory`:
      read-only timeline of `GarageUsageEvent` rows plus a "Notiz
      hinzufügen" dialog gated by `garageUsageEvent: ['create']`). New
      "Ausstattungsattribute" tab on `/verein`
      (`GarageAttributeTypeManager`, copy of `BoardMemberManager`'s
      full CRUD-dialog shape) for club-wide type definitions — same
      precedent as Stage 5/8 putting club-wide rate/config management under
      `/verein` rather than a standalone nav entry; no new top-level nav
      entry needed. Verified end-to-end via `pnpm run lint`, `tsc --noEmit`,
      and a `pnpm dev` + curl run against a throwaway org/user/facility/
      garage (no interactive browser available in this session): attribute
      type CRUD, duplicate name → 409; assignment upsert semantics (same
      row id on a second save, not a duplicate), invalid boolean/number
      values → clean 400s, not 500s; deleting an attribute type cascades
      its assignments, deleting a garage cascades both assignments and
      usage events; usage-history GET/POST for manual notes; RBAC (401
      unauthenticated on every new route; a second throwaway user added via
      `auth.api.addMember` with the read-only `member` role got 200 on
      every read and 403 on every mutation, including `garageUsageEvent`
      create, which `orgMember` deliberately doesn't have); `/garagen/[id]`
      SSR HTML confirmed to render both new tab triggers, `/verein`
      confirmed to render the Ausstattungsattribute tab trigger and its
      default-tab-inactive content only via the REST/data checks above
      (Base UI's `Tabs` only server-renders the active panel, per Stage 8's
      same testing-methodology note). The `createGarageAssignment`/
      `endGarageAssignment` auto-logging hook itself was verified by a
      one-off script replicating the exact call sequence added to
      `app/(app)/_actions/garage-assignments.ts` against a real DB (`type`
      Server Actions can't be invoked directly over HTTP the way REST
      routes can — same limitation Stage 2's `member`/`garage-assignment`
      Server-Actions-only drift already implied), confirming both events
      land with the correct `eventType`/`description`/`clubMemberId` and
      that ending an already-ended assignment would not double-log. All
      test data (org, both throwaway users, facility, garage, attribute
      types/assignments, usage events) cleaned up from the dev database
      afterward, including the Better Auth rows via a one-off script per
      the Stage 5+ pattern.
- [ ] Stage 10–15 — not started
