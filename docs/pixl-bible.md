# pixlvl Bible

## Purpose

This document describes the current `pixlvl` V1 game as it actually exists in the project today.

It is not a speculative brainstorm document anymore.
It is the source-of-truth design summary for the shipped foundation, followed by the most relevant next steps for V2.

---

## V1 identity

`pixlvl` is an idle-first arena defense game built around one persistent unit: the `pixl`.

The player does not manually move or aim during combat.
The game plays itself in the arena while the player improves the `pixl` through:

- long-term XP progression
- perk allocation
- loadout growth
- weapon collection
- spatial loadout optimization

The core fantasy is:

> Build a self-running `pixl` that survives increasingly dense glitch waves through better weapons, smarter loadouts, and steady permanent growth.

---

## Core loop

The current V1 loop is:

1. Enter the arena for a specific campaign level.
2. Watch glitches spawn from the outer arena and advance toward the center.
3. The `pixl` automatically attacks using equipped weapons.
4. Clearing enemies awards XP and can award weapon drops.
5. If the `pixl` dies, the current level resets locally.
6. Between or alongside combat, the player improves stats and loadout.
7. The player pushes higher levels or revisits unlocked stages with a stronger build.

This loop is now implemented, playable, and persistent.

---

## Arena model

The arena is a fullscreen-first combat surface.

V1 combat rules:

- The `pixl` stays fixed in the center.
- Glitches spawn around the outer edge of the arena.
- Glitches move inward until they reach contact range.
- Once engaged, glitches stop advancing and attack the `pixl` over time.
- The `pixl` auto-targets and fires without direct player input.
- Combat uses time-based simulation rather than frame-based logic.
- Failure only resets the current level, not the entire account.

The arena UI is intentionally overlay-driven:

- combat remains the main visual focus
- stats can be opened as an overlay
- campaign stage selection lives in a side drawer
- management-heavy systems live on dedicated routes

---

## Pixl progression

The `pixl` uses an XP-driven permanent progression model.

### Permanent stats

The current permanent progression stats are:

- `defence`
- `agility`
- `loadout size`

### Defence

`Defence` increases max health.

Current rule:

- each point gives roughly `+10%` health multiplicatively

### Agility

`Agility` increases sweep speed.

Current rule:

- each point gives roughly `+1%` sweep speed multiplicatively

### Loadout size

Loadout size grows from level milestones instead of direct manual purchase.

Current rule:

- starting size: `3 x 6`
- every `10` levels: `+1 row` and `+1 column`

This means early growth is:

- levels `1-9`: `3 x 6`
- levels `10-19`: `4 x 7`
- levels `20-29`: `5 x 8`
- levels `30-39`: `6 x 9`

### XP and levels

XP is lifetime progression, not a spendable pool that reduces your level when used.

Current level curve:

$$
xpToNext(level) = \lfloor 8 \times 1.16^{(level - 1)} \rfloor
$$

Current perk rule:

- each level after level `1` grants `1` perk point
- perk points can currently be spent on `defence` or `agility`

---

## Current sweep model

The combat timing model is based on a left-to-right sweep across the loadout.

V1 sweep rules:

- the sweep starts at the left side of the loadout
- it moves continuously to the right
- when it crosses a weapon's trigger column, that weapon activates once
- multiple weapons in the same trigger column activate together
- when the sweep reaches the far right, it resets to the left
- weapons do not currently have their own separate cooldown systems

Current baseline tuning:

- base sweep speed is `0.5`
- agility scales upward from that base

This system is the main bridge between permanent progression and loadout composition.

---

## Weapons and loadout

Weapons are the primary source of offensive identity in V1.

### Weapon model

Each weapon has:

- a rarity
- a rigid grid shape
- base damage
- projectile behavior
- projectile speed
- attack pattern
- a role description

### Loadout model

The loadout is a shape-based grid, not a list of slots.

Current rules:

- each weapon occupies its exact shape
- weapons cannot overlap
- weapons must fit inside the current grid bounds
- build strength depends on both what the player owns and how efficiently it fits

This gives `pixlvl` its strongest current identity:

- loot matters
- shape matters
- placement matters
- growth matters

### Inventory and clarity features already present

V1 already includes several quality-of-life pieces:

- grouped inventory display
- duplicate counts
- rarity styling
- structured tooltips
- equipped weapon summaries
- unread notifications for newly acquired weapon types

---

## Enemy model

The first enemy family is `Glitches`.

V1 has three melee archetypes:

- `Biter`
- `Swarmer`
- `Tanker`

### Biter

Baseline melee enemy.

Role:

- standard pressure
- moderate speed
- moderate survivability

### Swarmer

Fast pressure enemy.

Role:

- low durability
- high approach speed
- tests whether the build can prevent leak-through

### Tanker

Heavy pressure enemy.

Role:

- high durability
- slower advance
- punishes weak sustained damage

### Shared V1 enemy behavior

All three currently follow the same simple state loop:

1. spawn at the outer arena
2. move toward the `pixl`
3. enter contact range
4. stop moving forward
5. attack on a timed cadence until dead or until the level resets

This is the correct amount of complexity for V1.

---

## Targeting and projectiles

The `pixl` uses automatic targeting.

The current implementation direction is consistent with the original design goals:

- the `pixl` attacks enemies rather than requiring manual aim
- weapons fire projectiles rather than using instant-hit damage everywhere
- projectile speed remains part of weapon identity

The combat read is now strong enough to support later expansion into more advanced targeting rules, but V1 should keep the default readable and fixed.

---

## Campaign structure

V1 progression is organized by:

- `Campaign`
- `Stage`
- `Level`

Current shipped structure for the first campaign:

- `1` campaign
- `5` stages
- `10` levels per stage
- `50` total levels

Progression expectations:

- stages act as difficulty bands
- higher levels scale enemy pressure upward
- stage access is persistent once unlocked
- the player can revisit unlocked stages freely

The arena now supports choosing stage from an in-route campaign drawer rather than forcing a separate full-page setup flow.

---

## Reward model

V1 uses two reward layers.

### XP

XP is the permanent progression reward.

It drives:

- levels
- perk points
- loadout expansion milestones

### Weapon drops

Weapon drops are the primary build reward.

They drive:

- new offensive options
- new shape decisions
- replacement opportunities
- stronger loadout optimization pressure

This two-layer reward structure is good and should remain the base of the game.

---

## Failure model

Failure is intentionally local.

If the `pixl` dies:

- the current level resets
- persistent progression is retained
- the player is encouraged to iterate on build and progression rather than recover from total run loss

This is a defining part of V1 and should not be changed casually.

---

## Current UI architecture

The route split is now part of the game design, not just implementation detail.

Current route surfaces:

- `Arena`: live combat and overlays
- `Loadout`: shape-based build editing with live run continuity
- `Stats`: persistent progression and perk spending
- `Management`: campaign overview and stage-level progression context

Important V1 UI behaviors already achieved:

- arena remains centered and combat-first
- stats are available without abandoning the run
- stage selection can be opened from the arena
- loadout editing can coexist with a continuing run preview
- nav badges surface unread perk points and newly acquired weapon types

---

## What V1 has proven

V1 has successfully proven these pillars:

- the centered idle combat loop works
- local level reset is readable and low-friction
- XP progression works better than the old gold model
- shape-based loadout building gives the game identity
- route-based management is cleaner than stacking every system into one screen
- persistent progression and live overlays can coexist without breaking the arena

This means the project is no longer searching for its base loop.
The base loop exists.

---

## V1 limitations

The current game is coherent, but still intentionally narrow.

Known limitations of V1:

- only one campaign is effectively defined
- enemy behavior is still melee-only and fairly simple
- there are no advanced status effects or synergies yet
- targeting behavior is not yet a player-controlled system
- build diversity is mostly weapon-shape-driven rather than rule-system-driven
- long-term motivation beyond clearing harder content is still limited
- balance is functional but still early

These are acceptable V1 limitations.

---

## V2 priorities

The next phase should build depth on top of the stable loop, not replace it.

### Priority 1: enemy depth

Add one more layer of enemy differentiation.

Best candidates:

- ranged enemies
- support enemies
- split-on-death enemies
- elite variants
- boss mechanics beyond simple stat spikes

This is likely the strongest next lever because the combat shell is already solid.

### Priority 2: weapon identity and synergy

Increase the difference between weapons beyond raw shape and numbers.

Good directions:

- on-hit effects
- piercing
- chain attacks
- splash
- column-based synergy
- adjacency bonuses
- utility items versus pure weapons

### Priority 3: long-term goals

Add stronger reasons to keep playing after the first stable climb.

Candidates:

- campaign-specific unlocks
- weapon collection goals
- achievement-like milestones
- prestige or rebirth later
- build presets and saved loadouts

### Priority 4: balance pass

Run a more deliberate tuning pass across:

- early-wave pacing
- time-to-first-level
- time-to-first-drop excitement
- health scaling versus enemy contact pressure
- sweep speed feel at low and mid progression
- stage-to-stage difficulty spikes

### Priority 5: combat readability and polish

Improve the feel layer without changing the underlying loop.

Examples:

- stronger hit feedback
- better projectile readability
- clearer stage/boss transitions
- better death/reset messaging
- more satisfying reward presentation

---

## Immediate next design task

The immediate design task after this document should be:

> decide which V2 pillar gets built first, then document that pillar with the same level of clarity before expanding the codebase too broadly.

The best current candidate is enemy depth, because it adds meaningful gameplay variety without disrupting the proven V1 progression and loadout structure.

---

## Summary

`pixlvl` V1 is now:

- an idle arena defense game
- with persistent XP-based pixl growth
- shape-based weapon loadouts
- auto-targeted projectile combat
- local level-reset failure
- route-based management surfaces
- campaign progression with stage selection
- weapon-drop and perk-point notification feedback

That is a strong version 1 foundation.

The next step is not to rediscover the game.
The next step is to deepen it.
