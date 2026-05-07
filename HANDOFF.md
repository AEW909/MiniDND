# MiniDnD — Session Handoff

## What this is
D&D 5e character tracker built with Next.js 15 (App Router) + Supabase. Built for kids at the D&D table — intentionally simplified. No logins, PIN-gated parties.

**Supabase project:** ejjfumclyftxdpblkgfy (MiniDND, eu-west-1)
**GitHub:** https://github.com/AEW909/MiniDND.git
**Current commit:** 2bc3a19

## What was just completed

### Initiative persistence + UX rework (commits 7677a6d, 2bc3a19)
- New `encounters` table (`party_id` PK, `is_active`, `round`, `current_id`, `entries` JSONB)
  - **Run migration:** `supabase/migrations/001_encounters.sql` in Supabase SQL editor
- All panel actions (reorder, add, remove, next turn) upsert full state to DB
- Realtime subscription on `encounters`: any device change syncs immediately
- On campaign mount: if `is_active`, panel auto-reopens with correct turn/round/NPC state
- `currentId` and `round` lifted from `InitPanel` local state to parent (controlled)
- `+` button replaces "Add NPC" button: shows inline NPC form, or a picker menu when
  party members are missing from the list (tap to restore them)
- "End" button (was "Clear") shows inline confirm before setting `is_active=false`
- `AddNpcModal` deleted — form lives inside `InitPanel`'s picker

### Mobile swipe-snap (commit 3837e20)
- `snap-x snap-mandatory` on the scroll container, disabled at `md:` breakpoint
- Each PC card: `w-[100dvw] snap-start shrink-0` on mobile, `md:w-[300px] md:min-w-[300px]` on desktop
- Initiative panel (fixed overlay), conditions picker, death saves, rest panel — all contained within the card, unaffected
- Removed the explicit `minWidth` calculation from the inner flex container

### Death saves tracker (commit ce2e72c)
- `death_saves JSONB NOT NULL DEFAULT '{"successes":0,"failures":0}'` on `characters` table
  - **DB migration still needs to be run in Supabase SQL editor** (see below)
- Campaign card: when `current_hp === 0`, shows ✗/✓ circles below temp HP row
  - Tap to mark failures (red) or successes (green)
  - 3 successes → "💤 Stable" banner; 3 failures → "💀 Dead" banner
  - Stable/dead state makes circles non-interactive (banner replaces them)
- Healing above 0 HP auto-clears saves (`applyHpChange`)
- Long rest clears saves alongside HP restore (`doRest`)
- Character overview: read-only death save circles in Overview tab when HP = 0

### Tracker-only design decision (same session)
The initiative tracker's roll button was already removed in a prior polish commit (`60dc352`). Design decision: the app is a pure tracker, not a dice roller. Physical dice stay at the table. Initiative is manual entry only. This applies to all future features — no per-stat roll buttons.

### DB migration to run
```sql
ALTER TABLE characters
  ADD COLUMN death_saves JSONB NOT NULL
  DEFAULT '{"successes":0,"failures":0}'::jsonb;
```

## Feature history (recent)
- `c191870` — Initiative tracker polish (NPC colors, button order)
- `d50434d` — Passive Perception, Wisdom, Insight stats
- `582456b` — Initiative tracker (panel, party auto-populate, NPCs, drag-to-reorder, sort, clear)
- `733b678` — Conditions tracker (per-character, realtime, campaign card + overview badges)

## Potential next features (no priority order)
- **Concentration tracking** — tag a spell as requiring concentration, show indicator on card, auto-clear on damage
- **Short rest** — separate from long rest; hit dice recovery (enter number of dice rolled)
- **Dice tray** — a single floating 🎲 FAB with d4–d20, clean standalone feature if physical dice aren't at hand
- **Sort by roll in initiative** — currently manual entry + drag; could add a number field per combatant and auto-sort button

## Key files
- `app/campaign/[partyId]/page.tsx` — live campaign view (main place to work)
- `app/character/[id]/page.tsx` — character sheet (6 tabs)
- `app/party/[id]/page.tsx` — party detail + character creation
- `lib/constants.ts` — all shared constants (CONDITIONS, ABILITY_EMOJI, CLASS_SAVE_PROFS etc.)
- `lib/types.ts` — TypeScript interfaces (Character, Party etc.)
- `lib/theme.ts` — applyTheme(), resetToGlobalTheme()
- `lib/spell-slots.ts` — SRD spell slot tables

## Important technical notes
- Supabase Realtime: characters, character_inventory, character_spell_slots, character_other are all in the `supabase_realtime` publication with `REPLICA IDENTITY FULL`
- Stale closure pattern: realtime reload functions use `getPartyCharIds()` to query Supabase fresh (not from React state closure)
- Tailwind v4, CSS variables for theming (`var(--gold)`, `var(--surface)`, `var(--border)` etc.)
- TypeScript check: `node node_modules/typescript/bin/tsc --noEmit`
- No local Supabase CLI link / no migrations directory — run schema changes directly in Supabase SQL editor
- Character page has no realtime subscription — death saves and conditions are load-time snapshots on that view
