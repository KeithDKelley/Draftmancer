# Draftmancer Pack Generation Library

Extracted from Senryoku/Draftmancer (MIT). This is a stripped-down library for generating MtG booster packs programmatically. All server, client, draft-mode, bot, and persistence code has been removed.

This library is consumed by EDHProgression as a git submodule + npm `file:` dependency. The public API is `src/index.ts`. Do not break exports there without updating EDHProgression's `PackGenerator.ts`.

## Setup

```bash
git submodule update --init    # pulls magic-sealed-data
npm install
npm run build                  # compiles to dist/
```

## Key Files

```
src/
  index.ts                     ← public API — all exports the library exposes
  BoosterFactory.ts            ← core pack generation (5000 lines, 40+ set subclasses)
  PaperBoosterFactory.ts       ← sheet/weight collation using magic-sealed-data
  Cards.ts                     ← card database loader (top-level await, reads data/)
  ICardCollection.ts           ← thin interface replacing the old Session dependency
  PackGenerator.ts             ← NOT HERE — lives in EDHProgression/src/packs/
  data/
    magic-sealed-data/         ← submodule: taw/magic-sealed-data
    *.json                     ← Jumpstart, land, set info data (committed directly)
data/
  MTGCards.*.json              ← card database (4 shards, ~144MB total)
  CardsByName.json
  mb1_cards.json
```

## Two Factory Types

**`BoosterFactory`** — pool-based, stateful and destructive.

Built from a `SlotedCardPool` (Map of cardID → count, keyed by rarity). Each `generateBooster()` call removes picked cards from the pool via `CardPool.removeCard()`. Size the pool for all packs upfront. Returns `MessageError` if the pool is exhausted.

`getBoosterFactory(set, cardPool, landSlot, options)` routes to the correct set-specific subclass automatically. 40+ sets have custom subclasses in `BoosterFactory.ts` that enforce set-specific rules: guaranteed legendaries (DOM, DMU), MDFC placement (ZNR, MID), bonus sheets (STX, BRO, MH3), etc.

**`PaperBoosterFactory`** — sheet/weight-based, stateless.

Data driven from `data/magic-sealed-data/sealed_extended_data.json`. Each set defines named sheets (weighted card lists) and booster configurations (how many cards from each sheet). Each `generateBooster()` call independently samples from the full sheet weights — no state, no depletion. More accurate to real pack collation for supported sets.

`isPaperBoosterFactoryAvailable(set)` — check before constructing.
`getPaperBoosterFactory(set, options)` — construct.

## Collation Primitives (cardUtils.ts)

Four picking strategies available independently:
- `pickCard(pool, booster, options)` — uniform pick with 3-retry duplicate protection
- `ColorBalancedSlot.generate(count)` — forces one of each color (WUBRG), then fills remaining slots with a corrective probability formula that preserves the expected mono/non-mono ratio
- `pickPrintRun(count, printRun, groupSize)` — simulates physical print run collation (sequential walk from random start)
- `pickStriped(count, sheet, length, weights)` — simulates striped sheet collation (diagonal zig-zag walk)

## Card Data Loading

`Cards.ts` uses **top-level await** at module load time:

```typescript
const DBFiles = await glob("data/MTGCards.*.json");  // relative to process.cwd()
```

The `data/` directory must exist relative to wherever the consuming process runs. When installed as a `file:` npm dependency, this resolves to the library's own root. If the consumer's working directory is wrong, card loading will silently produce an empty card database — all subsequent getCard() calls will throw.

## Session Dependency (Historical)

The original `BoosterFactory.ts` imported `Session` (3988-line server class) to handle MTGA-collection-restricted drafts. This was replaced with a 2-method interface:

```typescript
// src/ICardCollection.ts
interface ICardCollection {
    unrestrictedCardPool(): boolean;
    restrictedCollection(sets: string[]): CardPool;
}
```

`BoosterFactoryOptions.session?: ICardCollection` — pass an implementation to restrict which cards can appear in packs (e.g. only cards a player owns). Pass nothing to use the full card pool.

## Sealed Data Submodule

`data/magic-sealed-data/` is a submodule pointing at `taw/magic-sealed-data`. It has no stated license but is a freely-used community resource. Update it when new MTG sets release:

```bash
git submodule update --remote data/magic-sealed-data
git add data/magic-sealed-data
git commit -m "bump magic-sealed-data for <set name>"
```
