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
4. Clearing a full level awards XP and can award sealed reward packs.
5. If the `pixl` dies, the current level resets locally.
6. Between or alongside combat, the player improves stats and loadout.
7. The player pushes higher levels or revisits unlocked stages with a stronger build.

This loop is now implemented, playable, and persistent.

---

## Current implementation snapshot

The current project state is materially larger than the original V1 foundation.

Current implemented content counts:

- `5` defined campaigns
- `50` levels per campaign
- `72` unique loadout definitions in the core campaign registry
- `51` weapons
- `21` utilities
- `72` definitions in the shared reward-pack pool
- `23` definitions currently seeded into the cross-campaign shared pool

Current meta systems:

- a live top-`5` progression leaderboard now exists and is exposed from both the main page and a dedicated leaderboard route
- leaderboard ranking currently prioritizes the furthest campaign reached, then best cleared level, then pixl level and total XP as tiebreakers
- the current rank `1` player gets a crown rendered on their pixl in the main intro display and arena views

Current per-campaign definition counts:

- Campaign `1`: `30` definitions (`24` weapons, `6` utilities)
- Campaign `2`: `37` definitions (`26` weapons, `11` utilities)
- Campaign `3`: `40` definitions (`25` weapons, `15` utilities)
- Campaign `4`: `34` definitions (`27` weapons, `7` utilities)
- Campaign `5`: `34` definitions (`27` weapons, `7` utilities)

Current rarity distribution across unique definitions:

- `11` normal
- `16` magic
- `22` rare
- `12` exotic
- `11` legendary

## Risk overview

These are the main known implementation and release risks worth tracking right now.

### Current active risks

#### Client gameplay bundle size

Status:

- `monitored`, not currently blocking

Current observation:

- the production client build currently emits a large minified chunk of roughly `1.18 MB`
- the dominant contributor appears to be the bundled `p5` runtime plus gameplay-side canvas code
- this is considered acceptable for combat-heavy routes in the current phase, but should not spread broadly into non-game routes

Why it matters:

- can slow first-load time for gameplay pages
- can increase parse and execution cost on lower-end devices
- becomes more serious if homepage, auth, dashboard, or other non-combat routes begin paying this cost unnecessarily

Current stance:

- acceptable for now because the gameplay loop is intentionally client-heavy
- not a correctness risk
- should be revisited if mobile performance, first-load responsiveness, or route isolation becomes an issue

Preferred future mitigation:

- keep `p5` and combat runtime isolated to routes that truly need the canvas
- avoid pulling gameplay runtime into non-combat surfaces
- defer any deeper chunk-splitting work until performance symptoms appear or release hardening starts

### Season 1 weapon roster milestone

The first public release / Season `1` content target should be much larger than the current roster.

Weapon milestone:

- target `150` total loadout definitions for the Season `1` roster
- current implemented count is `73` definitions
- remaining gap is `77` additional definitions

Important counting rule:

- utilities count toward this milestone
- the current `73 / 150` progress includes both `51` weapons and `22` utilities

Target rarity mix for the full Season `1` weapon roster:

- `25` normal
- `40` magic
- `40` rare
- `30` exotic
- `15` legendary

This target intentionally keeps `magic` and `rare` as the dominant middle of the roster, with fewer `normal` weapons, fewer `exotic` weapons, and the fewest `legendary` weapons.

The purpose of this milestone is to make the first release feel like a real weapon ecosystem rather than an early foundation set.
It should support multiple archetypes, repeatable synergy packages, and enough breadth that new campaigns and future seasons can build on top of a stable core library instead of constantly backfilling obvious gaps.

Latest roster pass:

- the mine package is now complete enough for release-candidate iteration
- `Shield Turret` is now live as a magic mine utility that deploys a perimeter shield emitter, then converts `10%` of total mine-family damage dealt into a rechargeable shield that stays active until broken
- the next implemented support package is a helper-oriented pylon set, not a standalone archetype
- current support pylons: `Mark Beacon`, `Cold Lattice`, `Mine Calibrator`, `Hemorrhage Relay`
- design rule: pylons should improve existing builds like knives, mines, slower projectiles, and status packages rather than replace them
- the next helper package is now live as fixed-placement laser rods: `Ember Rods`, `Coldwire Rods`, `Sunder Rods`
- laser rods use the targeting menu as arena anchor selection with eight fixed positions around the pixl
- rods are intentionally non-functional alone; they only create damage or debuff lanes when at least two rods of the same weapon are active and linked
- the next elemental utility package is now live as pixl-bound cycle buffs: `Fire Boost`, `Lightning Boost`, `Cold Boost`, `Void Boost`
- all four pixl buffs use the same U-shaped footprint:

```text
X--X
XXXX
```

- pixl buffs trigger every cycle, keep their aura active between sweeps, and boost only that element's infused weapon damage until the next cycle refreshes them
- only one pixl boost can be active at a time; a newly triggered boost overwrites any previously active elemental pixl boost
- the elemental apex version is now `Elemental Mastery`, a legendary hollow rectangle that fits all four `2x2` infusers inside it
- `Elemental Mastery` consumes one fire, lightning, cold, and void infusion together, then grants `200%` extra elemental damage across all infused weapons with a deliberately chaotic multi-element pixl aura
- while `Elemental Mastery` is active, subsequent elemental weapons require `1` fewer infusion of their element to fire, to a minimum cost of `0`
- `Void Tendrils` has been reworked away from delayed multihit damage into a true void sustain/control weapon: it captures up to `3` non-boss glitches, makes them untargetable for `2` cycles, then consumes them into temporary HP equal to their max health
- `Void Rift` is now live as an exotic void damage weapon: it opens a narrow player-targeted seam, shreds a compact cluster with high tick damage for about one cycle, then collapses into an AOE pulse whose damage scales with the total damage dealt during the rift
- `Parasite Bloom` is now live as a rare anomaly sustain weapon: it infects the strongest target for a short window, and if that host dies before the parasite expires it releases a healing pulse that restores pixl health based on the host's max health
- `Prism Prison` is now live as a rare anomaly trap weapon: it drops a geometric cage over the chosen cluster, stays armed until a glitch first pushes into its edges, then repeatedly cuts intruders for a short active window; each weapon instance can keep only one prison armed or active at a time
- `Mirror Array` is now live as an exotic anomaly utility: it paints a forward half-arena mirror and reflects shots that pierce through or miss into it back across the arena as splash echoes

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
- the sweeper/loadout preview panel shows actual weapon damage dealt in the most recently completed sweep cycle
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
- equipped weapons can be rotated freely in `90°` steps
- weapons cannot overlap
- weapons must fit inside the current grid bounds
- build strength depends on both what the player owns and how efficiently it fits

Rotation rules:

- rotation is applied per equipped copy, not per weapon definition
- all pieces support the full `0°`, `90°`, `180°`, `270°` rotation set, even if a piece is mirrored or symmetric
- rotation changes both fit and combat timing, because the sweep still keys off the leftmost occupied column of the rotated shape
- the loadout editor should teach this with a one-time first-use prompt when the player first picks up a piece

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

### Duplicate economy and shop state

Duplicates are currently a natural part of the drop loop, and that is good.
They support:

- multiple copies of strong filler weapons
- alternative loadout shapes using the same weapon family
- build flexibility while the inventory is still small

That second reward loop is now implemented.

Current duplicate-economy rules:

- duplicate weapons that are not currently equipped can be scrapped
- scrapping produces a persistent resource called `Scrap`
- `Scrap` is spent in a `Shop`

Initial scrap values by rarity:

- `normal`: `5` Scrap
- `magic`: `25` Scrap
- `rare`: `100` Scrap
- `exotic`: `500` Scrap
- `legendary`: `5000` Scrap

Current scrap rules:

- only duplicates can be scrapped
- equipped items cannot be scrapped
- an item must be unequipped before it becomes scrapable
- scrapping supports grouped bulk actions for unupgraded copies
- upgraded copies are scrapped one at a time and include partial refund value in their total payout
- scrapping `exotic` or `legendary` items requires explicit warning confirmation before the action completes
- upgraded items also require explicit warning confirmation before scrapping

Current shop rules:

- the shop unlocks fully after the player completes campaign `1`
- shop stock refreshes every `15` minutes
- each refresh rolls `15` distinct offers in fixed rarity bands
- each refresh contains `5` normal offers, with `1` guaranteed elemental infuser slot
- each refresh contains `4` magic offers, `3` rare offers, `2` exotic offers, and `1` legendary offer
- shop stock can pull from the full loadout item registry instead of only shop-exclusive pools
- owned items are still allowed to reappear, but missing items should be weighted more heavily than duplicates
- duplicate shop purchases are allowed, so shop items can become real loadout pieces rather than one-time unlocks

The shop should not replace drops.
It should sit beside them as a pressure-release valve and long-term goal layer.

Design intent:

- drops remain the primary source of new weapons
- duplicates remain useful in the early and mid game
- excess duplicates become meaningful instead of dead inventory
- the player gains some agency over bad luck without deleting randomness

This means duplicate handling has already evolved into:

> drop -> keep or equip -> duplicate overflow -> scrap -> save toward unique shop items

What is still missing is not the existence of the duplicate economy, but its next layer of depth.

Remaining follow-up for this system:

- add shop-exclusive utilities alongside the current weapon stock
- keep tuning offer weighting, pricing, and campaign unlock pacing
- decide whether Scrap should gain additional sinks besides shop purchases and weapon upgrades
- continue improving inventory clarity around bulk scrap, upgraded copies, and favorites

Shop direction that is already live:

- stock should focus on unique, curated items rather than common filler
- shop items should feel special enough that saving Scrap is a real choice
- shop inventory can include weapons, utilities, or other build-defining unlocks
- the shop should help players chase missing build pieces at a hefty Scrap cost
- the shop should avoid becoming a full replacement for campaign progression rewards

Shop weapon philosophy:

- shop weapons should have a clear tactical purpose rather than being generic stat upgrades
- each shop weapon should help solve a recognizable player problem or build weakness
- the player should be able to look at a shop item and immediately understand what issue it is meant to address

Examples of intended shop weapon purpose:

- anti-ranged pressure
- anti-swarm or other AOE coverage
- anti-tank sustained damage
- leak prevention against fast enemies
- backline reach or priority-target removal

This gives the shop its own role:

- campaign drops provide the broad loot loop
- shop items provide more deliberate agency when the player identifies a specific weakness in their current build

Shop role is now broader:

- campaign drops should remain the source of normal campaign loot
- the shop should act as a deliberate chase outlet for missing items
- the shop can now surface both weapons and utilities from the broader loadout registry
- this keeps Scrap spending exciting without forcing the shop to rely on a tiny exclusive pool

Duplicate purchase behavior:

- shop-exclusive items are not one-time unlocks only
- if a player wants multiple copies of the same shop item for loadout reasons, they should be allowed to buy duplicates over time
- purchased shop items can therefore reappear in later refreshes if the roll selects them again

Shop item mix:

- the live shop mix is a rarity-banded rotation rather than a small campaign-exclusive rack
- elemental infusers are guaranteed to appear once per refresh within the normal band
- the shop can pull both weapons and utilities when they satisfy the rarity slot being filled

Progression gating:

- the shop should remain closed until campaign `1` is completed once
- after that clear, the full shop model is unlocked permanently
- the player should still need significant Scrap savings to buy higher-rarity chase items

This means the shop should behave like a Scrap-driven chase supplement:

- complete campaign `1`
- unlock the full rotating shop
- spend Scrap on missing or high-priority chase pieces when the rotation cooperates

The goal is to let Scrap smooth progression and provide player agency without turning the shop into a campaign skip system.

Shop refresh model:

- the shop should include a controlled amount of randomness
- shop inventory should refresh every `15` minutes
- each refresh should roll `15` distinct items from the full loadout item registry once the shop is unlocked
- each refresh must contain `5` normal items, `4` magic items, `3` rare items, `2` exotic items, and `1` legendary item
- one of the normal slots must always be an elemental infuser
- missing items should be weighted above already-owned duplicates so the shop helps chase gaps in a collection
- duplicates can still appear because repeat purchases are allowed, but they should be less common than missing items

Rarity and pool behavior:

- rarity now determines slot counts directly
- normal offers provide utility and broad access, especially through the guaranteed infuser slot
- magic, rare, exotic, and legendary slots provide the real chase pressure
- the pool is full-registry after unlock, not campaign-banded

This means the intended flow is:

- complete campaign `1`
- wait for each `15` minute refresh window
- inspect the rarity bands for missing or build-defining items
- spend Scrap only when the rotation surfaces something worth the cost

This remains a stronger near-term retention feature than prestige, and it is now one of the game's active progression layers rather than a purely future design note.

### Weapon upgrades state

Per-instance weapon upgrading is now implemented.

Design intent:

- duplicates should continue to matter after the player stabilizes a collection
- Scrap should become a meaningful long-term sink rather than only a shop currency
- upgraded items should feel like invested gear rather than fungible duplicates
- upgrading should add more player interaction without turning the inventory into noise

Current rules:

- upgrades apply per weapon instance, not per weapon definition
- only weapons can be upgraded
- utilities cannot be upgraded
- max weapon upgrade level is `+5`

Upgrade presentation:

- upgraded weapons keep their original tile and visual identity
- upgraded weapons should display their name as `Original Name +N`
- upgraded copies should be treated as distinct items instead of being bunched together with base duplicates

Duplicate and scrap rules for upgraded weapons:

- upgraded weapons should never be included in bulk scrap actions
- upgraded weapons can still be scrapped individually
- scrapping an upgraded weapon should refund `50%` of the Scrap invested into leveling it
- upgraded weapons should be treated as distinct inventory entries rather than duplicate-stack candidates

Upgrade cost formula:

- rarity multipliers:
  - `normal = 1`
  - `magic = 2`
  - `rare = 3`
  - `exotic = 4`
  - `legendary = 5`
- cost to upgrade from level `N` to level `N+1`:

$$
upgradeCost = 100 \times rarityMultiplier \times (N + 1)
$$

Examples:

- `normal` to `+1`: `100`
- `magic` to `+1`: `200`
- `magic` from `+2` to `+3`: `600`

Upgrade stat scaling:

- every weapon upgrade level gives `+10%` damage
- every weapon upgrade level gives `+5%` projectile speed

Final upgrade capstone rule:

- only weapons whose base `attack.projectileCount > 1` qualify for the final projectile capstone
- at `+5`, qualifying multi-projectile weapons gain `+1 projectile`
- at `+5`, single-projectile weapons gain an additional `+20%` damage on top of the normal `+10%` from that level

This means:

- multi-projectile weapons at `+5` end at `+50%` damage, `+25%` projectile speed, and `+1 projectile`
- single-projectile weapons at `+5` end at `+70%` damage and `+25%` projectile speed

System classification note:

- category should determine upgrade eligibility, inventory grouping, and scrap rules
- category should not by itself change combat behavior
- this allows zero-damage former weapons to become utilities without changing how they trigger or resolve during combat

Implementation warning:

- some multi-projectile weapons use custom firing logic rather than the generic spread path
- the `+1 projectile` capstone should still apply to them, but may require weapon-specific runtime handling
- examples already in that category include `Blaster`, `Splitter`, and `Pulse Array`

The intended long-term loop becomes:

> drop -> equip or scrap -> save Scrap -> invest in specific weapon copies -> keep upgraded copies out of bulk scrap -> recycle bad investments at partial refund

Current implementation state:

- owned weapon instances persist both `upgradeLevel` and `totalScrapInvested`
- upgrade cost is already rarity-based and Scrap-funded
- upgraded weapons already display as `Original Name +N`
- combat scaling is already applied per equipped instance rather than by mutating the shared base registry
- the single-projectile capstone bonus and generic multi-projectile `+1 projectile` capstone are already wired into the upgraded combat definition path
- inventory and scrap flows already split upgraded copies away from bulk duplicate scrap groups

Remaining upgrade work:

- verify or extend `+5` projectile-capstone support for weapons that use bespoke activation paths
- decide whether any additional upgraded-weapon UI belongs outside the current loadout flow
- reclassify zero-damage weapons that should behave as utilities in economy and grouping terms while preserving their combat behavior
- keep reviewing whether refund values and upgrade pacing still feel correct at scale

Zero-damage reclassification candidates still worth revisiting:

- `Void Tunnel`
- `Black Hole`
- `Phaseshift`
- `Force Field Trap`

Guardrails that still matter:

- upgraded copies must never become part of bulk duplicate scrap
- refund must continue to use stored invested Scrap rather than inferred historic cost
- per-instance combat scaling must remain isolated from shared base definitions
- zero-damage reclassification must not accidentally change combat behavior

### Cross-campaign weapon expansion state

The codebase already has a first shared cross-campaign pool.

Current shared-pool state:

- a curated shared pool of `9` definitions is seeded into Campaigns `2` through `4`
- the current shared set is focused on mark, execute, bleed, and precision-damage packages
- this shared pool already helps later campaigns avoid being completely isolated from earlier build shells

The current campaign-local pools are still not large enough on their own to guarantee satisfying long-run variety, especially once pack rewards and late-game repetition are taken into account.

The next weapon-expansion pass should therefore grow the existing shared pool rather than invent it from scratch.

The next concrete weapon pass should be `mines`.
That pass should be treated as a full shared archetype package rather than a single one-off weapon.

These should not erase campaign identity.
They should fill tactical gaps, deepen synergy options, and prevent later pools from collapsing into the same few repeated high-rarity outcomes.

#### Next pass: mines

The next serious content pass should focus on mine weapons and mine-adjacent support pieces.

Mine design intent:

- give the roster a real delayed-detonation / area-denial package
- support anti-swarm, lane denial, and staged burst patterns that do not rely on direct instant-fire weapons
- create weapons that reward prediction, setup, clustering, forced pathing, or repeated trigger zones
- open room for synergy hooks like pulls, slows, freezes, marks, vulnerable windows, chained detonations, or corpse-style cleanup effects

Core mine-package rule:

- mines should explicitly synergize with other mines in the same build
- each additional mine should contribute a shared bonus that improves the whole mine package rather than only its own local effect
- the baseline mine-family scaling rule should be additive and easy to read so future mine variants can build on top of it cleanly

Baseline shared mine scaling:

- each copy of `The Mine` adds `+20%` damage to all mine effects triggered in that sweep cycle
- this bonus should be treated as a mine-family multiplier, not a self-contained stat line that only affects one placed instance

##### The Mine

- rarity: `normal`
- type: `weapon`
- role: baseline mine keystone and simple perimeter trap

Behavior:

- places a persistent mine in a perimeter ring outside the `pixl`
- the mine remains armed until a glitch collides with it
- on collision, the mine explodes and deals its damage in that contact area
- each copy of `The Mine` adds `+20%` damage to all mines in the sweep cycle

Design purpose:

- establish the mine family as a real archetype from the normal tier upward
- give early mine builds a readable anchor piece that scales naturally when the player commits to more mines
- make additional mine placements feel like a package upgrade rather than disconnected duplicate filler

Mine rarity direction:

- normal and magic mines should establish basic trap cadence, delayed pop, or cheap space control
- rare mines should introduce tactical payoffs such as chaining, shaped blast zones, or anti-elite conversion
- exotic mines should become build-defining area-control engines or synergy anchors
- legendary mines should significantly alter board construction, sweep planning, or how enemies are funneled into kill zones

#### Dev inventory seeding workflow

When a new shared archetype is implemented and needs real loadout testing, we should seed it directly into the dev account inventory instead of overloading the weapon lab.

The current canonical workflow is a one-shot Node script that writes the correct `owned_weapons` JSON shape into `pixl_state`.
This is more reliable than trying to hand-write raw SQL because the payload needs fresh instance ids and the exact persisted weapon object fields.
It also reads the repo `.env` database context, which avoids accidentally writing to a different Neon database than the app is currently serving from.

Standard command:

```bash
yarn grant:dev-inventory the-mine cluster-mines shrapnel-mine mine-echo
```

Optional alternate target account:

```bash
yarn grant:dev-inventory --email someone@example.com the-mine cluster-mines
```

Underlying script:

```bash
yarn grant:dev-inventory --help
```

Usage notes:

- the command defaults to `alsing3520@gmail.com`, so the normal flow only needs definition ids as trailing arguments
- replace the trailing arguments with the exact weapons or utilities being tested
- this appends only missing definitions and preserves the rest of the account inventory
- update `acknowledged_weapon_definition_ids` in the same write so the newly seeded items do not look unread or partially registered
- if the loadout UI still does not show the new items immediately, reopen the page against a fresh server response before assuming the seed failed

#### Dev dungeon key seeding workflow

Dungeon entry testing should use a matching dev key grant command instead of ad-hoc SQL edits.

The canonical workflow mirrors the shared inventory script: it reads the repo `.env`, targets the default dev account unless overridden, and writes the full `dungeon_keys` JSON shape back into `pixl_state`.

Standard command:

```bash
yarn grant:dev-dungeon-keys dungeon-1-key
```

Optional alternate target account:

```bash
yarn grant:dev-dungeon-keys --email someone@example.com dungeon-1-key
```

Optional bulk increment:

```bash
yarn grant:dev-dungeon-keys --count 3 dungeon-1-key
```

Underlying script:

```bash
yarn grant:dev-dungeon-keys --help
```

Usage notes:

- the command defaults to `alsing3520@gmail.com`, so the normal flow only needs one or more dungeon key ids as trailing arguments
- valid ids currently match the finite dungeon ladder: `dungeon-1-key` through `dungeon-5-key`
- each trailing key id increments that specific counter, and `--count` applies that increment per provided key id
- this preserves the other dungeon key counters instead of replacing the whole inventory manually

#### Shared-pool design goals

- low-damage weapons must never become dead items that are simply outscaled by later raw DPS
- every weapon should solve a recognizable problem such as swarm pressure, ranged pressure, elite cleanup, leak prevention, or tempo control
- the most interesting items should create synergy packages rather than stand alone as generic stat sticks
- strong weapons should define or reshape a build archetype, not just add more damage
- shared-pool additions should make single-target, control, and support styles remain relevant in later campaigns

#### Core rules for future shared weapons

- normals should usually solve one specific tactical problem rather than being generic weak fillers
- magics should improve consistency or bridge two systems together
- rares should introduce a clear tactical pattern or payoff window
- exotics should create strong synergy hooks that encourage build planning
- legendaries should change how the player wants to construct the whole board
- no low-damage weapon should exist without at least one lasting source of value such as vulnerability, slow, freeze, grouping, team amplification, reach extension, sustain, sweep manipulation, or percent-health pressure

#### Primary cross-campaign archetype packages

The current shared pool already leans on a few repeatable archetypes, and the next pass should deliberately round them out:

- mark and focus-fire
- execute and cleanup
- swarm control and chip conversion
- range access and backline pressure
- sweep-order and trigger-column synergy
- status setup and payoff
- control-heavy single-target conversion

The goal is to let players recognize a build shell across campaigns while still using campaign-specific headliners and visuals.

#### Expansion shortlist

The following concepts are still worth preserving as the next serious shared-pool expansion set.

##### Target Painter

- rarity: `normal`
- type: `weapon`
- cadence: `2` cycles
- role: focus-fire relay and priority-target setup

Behavior:

- exactly one enemy should remain marked at all times while enemies are alive
- the mark increases damage taken from all direct attacks
- if the marked enemy dies, the mark immediately bounces to a nearby enemy
- in dense swarms the mark should be able to jump repeatedly between kills

Design purpose:

- keeps single-target builds efficient during long waves instead of overkilling only one enemy at a time
- scales through the rest of the build rather than through its own base damage

Best fit:

- snipers
- heavy single-hit weapons
- execute weapons
- fork-lightning or bounce-adjacent hit chains

##### Kill Switch

- rarity: `rare`
- type: `weapon`
- cadence: `3` to `4` cycles
- role: cleanup and anti-clog execution tool

Behavior:

- emits a very thin pulse wave outward from the `pixl`
- any enemy struck by the pulse and already below `15%` health is executed instantly
- enemies above that threshold should take negligible or no direct effect

Design purpose:

- converts chip damage, burns, chills, and partial wave damage into actual cleanup
- gives supportive or control-heavy builds a way to close waves cleanly

Best fit:

- burn packages
- chill and freeze setups
- swarm chip builds
- mark and vulnerability shells

##### Oathbreaker Sigil

- rarity: `legendary`
- type: `utility`
- cadence: `3` cycles
- shape: large
- role: single-target conversion keystone

Behavior:

- emits a broad half-circle pulse covering roughly `50%` of the visible screen in front of the `pixl`
- all enemies hit by that pulse are chained together for a short duration
- chained enemies are slowed by `80%`
- while chained, `60%` of direct weapon-hit damage dealt to any one chained enemy is duplicated across all other chained enemies hit by the pulse
- only direct weapon hits are shared
- burn ticks, damage-over-time, execute effects, field damage, and other indirect effects must not duplicate through the chain

Design purpose:

- keeps single-target weapons relevant in later campaigns by converting focused damage into temporary wave damage
- creates a real late-game archetype where precision damage can scale into dense formations without simply inflating all single-target numbers

Best fit:

- snipers
- mark builds
- heavy projectile hitters
- any direct-hit weapon that otherwise struggles into density

##### Deadeye Sniper

- rarity: `exotic`
- type: `weapon`
- cadence: `2` cycles
- base damage: `120`
- role: pure single-target sniper anchor

Behavior:

- fires one hard-hitting sniper shot at a single target every `2` cycles
- no splash, no chains, and no built-in area damage
- exists to be the clean high-damage precision option rather than a wave-clear tool

Design purpose:

- gives Oathbreaker, mark, and other precision shells a simple raw-damage anchor
- creates a clear contrast with Redline Sniper by dropping all pseudo-AOE behavior in exchange for much harder single hits

##### Support concepts worth keeping for the same pool

These remain good candidates for the first shared-pool pass even if their exact tuning changes later:

- `Scrap Flinger`: anti-swarm chip plus light knockback support
- `Static Net`: multi-target slow and chain-pressure support
- `Tempo Coil`: left-to-right sweep payoff setup
- `Gravity Pin`: grouping and anti-rush control
- `Corrosion Sprayer`: sustained resistance shred or effective-health erosion
- `Arc Javelin`: distance-scaling backline pressure
- `Frostbrand Array`: broad chill spread support
- `Ash Cycler`: hit-count to burn-burst conversion
- `Event Horizon`: large-scale control anchor for void and area builds
- `Last Word`: right-edge sweep finisher payoff
- `Amplifier Node`: next-weapon sweep amplifier utility
- `Infusion Battery`: elemental timing smoother
- `Shock Router`: lightning propagation bridge utility
- `Cryo Condenser`: freeze-threshold support utility
- `Cinder Bellows`: burn and control crossover utility

#### Bleed package direction

Bleed should become the main physical status package for later content.

It should not just be another generic damage-over-time label.
Its job is to let precise direct-hit weapons store delayed kill pressure and then convert that pressure into controlled wave damage later.

##### Bleed identity

- damage family: `physical status`
- primary fantasy: wounds that keep draining after the hit lands
- best friends: fast multihit weapons, crit-like heavy hits, execute tools, and rupture payoffs
- weakness by default: poor native AOE unless another weapon or utility converts it

Bleed should therefore begin as a mostly single-target status and only become an AOE engine when the player assembles the correct later-campaign package.

##### Bleed scaling rule

Bleed should scale from stored direct-hit damage, not from enemy max health.

Recommended base rule:

- when a bleed-applying direct hit lands, it adds `stored bleed` equal to a percentage of that hit's final direct damage
- that stored bleed is then paid out over time as periodic physical damage
- reapplying bleed adds more stored bleed and refreshes the duration rather than creating many unrelated timers

Recommended first-pass numbers:

- base conversion: `35%` to `45%` of final direct-hit damage becomes stored bleed
- default duration: `3` cycles
- default tick rate: `1` tick per cycle
- default stack model: additive stored-damage pool with duration refresh

This means bleed naturally scales when:

- the source weapon's direct-hit damage scales
- the source weapon fires more often
- vulnerability, mark, or other direct-hit amplifiers are already online before the bleed is applied
- upgrade levels improve the original hit size

This is the correct scaling direction because it keeps bleed attached to the existing weapon ecosystem.

##### Bleed guardrails

- indirect damage should not recursively create bleed unless a very explicit legendary says otherwise
- bleed should not scale primarily from enemy max health because that risks making it the default best answer to every boss and elite
- baseline bleed should stay poor at full-screen swarm clear so it preserves a reason to build into rupture, grouping, or spread tools
- bleed stacks should be readable as one pooled wound state per enemy, not many tiny hidden debuffs

##### How bleed becomes AOE later

Later-campaign bleed AOE should come from `rupture`, not from giving every bleed source free splash.

Rupture is the key conversion rule:

- a rupture effect consumes some or all stored bleed on one enemy
- that consumed amount deals an immediate local burst in a radius, or seeds nearby enemies with new stored bleed, or both
- the conversion should require either enough stored bleed, a kill, or a dedicated payoff activation window

This keeps the build path legible:

1. apply wounds to priority targets
2. build stored bleed through repeated direct hits
3. convert that stored pressure into local wave damage through rupture tools

That is a much healthier model than making bleed itself automatically chain across the whole screen.

##### Recommended rupture patterns

The later campaign can mix these patterns, but they should remain distinct:

- `on-kill rupture`: when a bleeding enemy dies, part of its stored bleed bursts in a small radius
- `threshold rupture`: when stored bleed reaches a threshold, the next direct hit detonates a local burst
- `active rupture`: a weapon or utility periodically detonates the most wounded enemy in range
- `spread rupture`: consuming one target's stored bleed applies reduced fresh bleed to nearby enemies instead of full raw burst damage

The safest first implementation is `on-kill rupture` because it rewards setup and wave sequencing without letting a single early proc wipe everything.

##### Recommended later-campaign keystone

The cleanest first AOE payoff is a dedicated shared-pool or later-campaign item built around rupture.

Working concept:

- name: `Bloodletter Bloom`
- rarity: `exotic` or `legendary`
- type: `utility` or low-damage payoff weapon
- role: converts single-target bleed into controlled local AOE

Effect direction:

- every `3` to `4` cycles, target the enemy in range with the highest stored bleed
- consume `50%` to `100%` of that stored bleed
- create a medium-radius bloodburst around that enemy
- enemies caught in the burst take immediate physical damage based on the consumed amount
- optionally apply a smaller fresh bleed to enemies hit by the burst

Design purpose:

- gives physical direct-hit builds a real density answer without invalidating dedicated splash or control builds
- makes target prioritization and buildup matter before the payoff happens
- opens a later-campaign archetype where precise wound application turns into wave shredding only after enough setup

##### Bleed package ecosystem roles

If bleed becomes a serious package, the roster should eventually contain:

- one normal or magic bleed applier
- one rare fast-stack builder
- one exotic or legendary rupture payoff
- one support utility that improves bleed duration, tick rate, or wound retention during retargeting

That gives bleed the same kind of internal structure now being defined for mark, execute, burn, chill, and control packages.

##### First concrete bleed package

The first actual bleed package should be built as a named synergy ladder instead of a loose collection of unrelated status items.

The package should currently consist of:

- `The Knife`: base bleed applier
- `Hemorrhage Burst`: threshold rupture utility
- `Bloodbound Sheath`: exotic knife-frame amplifier
- `Blood Catalyst`: bleed multiplier utility
- `Siphoning Knife`: legendary finisher modifier

The intended play pattern is:

1. `The Knife` establishes early single-target wound pressure
2. `Hemorrhage Burst` converts overstacked bleed into controlled local wound spread
3. `Blood Catalyst` scales all stored bleed into serious kill pressure
4. `Bloodbound Sheath` turns `The Knife` into a late-game carry by dramatically increasing its direct-hit damage
5. `Siphoning Knife` turns the completed knife shell into a sustain-and-burst endgame package

##### The Knife

- rarity: `normal`
- type: `weapon`
- base damage: `5`
- role: baseline wound applier

Attack direction:

- follows `Splitter`-style targeting rules
- throws `3` knife projectiles toward distinct enemies when available
- it should not send multiple knives into the same target unless there are not enough valid targets in range
- visual should read as a clean knife throw, not a spread shotgun blast

Damage direction:

- the direct hit deals low blunt physical damage
- each successful direct hit applies bleed equal to `250%` of that hit's final modified direct-hit damage
- that bleed pays out over `10` seconds

Design note:

- `The Knife` is intentionally weak as raw damage
- its purpose is to seed heavy stored bleed early and then scale into a true carry once the rest of the package is assembled

##### Hemorrhage Burst

- rarity: `magic`
- type: `utility`
- role: bleed threshold rupture conversion

Effect direction:

- if an enemy's stored bleed exceeds its current maximum health, that enemy bursts
- the burst creates a blood explosion around the target
- the explosion deals only modest immediate local damage
- enemies hit by the rupture inherit a reduced fresh copy of that consumed bleed so the wound pressure can cascade outward over time

Rule direction:

- the rupture consumes all stored bleed on the target when it explodes
- the explosion should stay a tight local radius rather than filling most of the screen
- the rupture-seeded bleed can cause later follow-up bursts, but the explosion itself should not recursively detonate the whole chain in the same frame unless a later legendary explicitly adds that behavior

Design purpose:

- gives the bleed package its first real density answer
- rewards overstacking wounds on elites or frontliners and then cashing them out into nearby packs

##### Bloodbound Sheath

- rarity: `exotic`
- type: `weapon`
- role: knife-frame amplifier and late-game carry unlock

Assembly rule:

- has a hollow internal socket shaped for `The Knife`
- the bonus activates only when `The Knife` is placed fully inside that socket
- this is an explicit socket rule, not an adjacency rule

Effect direction:

- while socketed, `The Knife` gains `x5` direct-hit damage
- later extensions may also grant `The Knife` pierce, ricochet, or another carry-facing payoff, but the first version should focus on the raw damage multiplier

Design purpose:

- solves the core scaling issue where `The Knife` starts correctly as a low-base-damage bleed weapon but falls off too hard later
- keeps `The Knife` itself as the main character of the package instead of handing the payoff role to a separate proc engine

##### Blood Catalyst

- rarity: `exotic`
- type: `utility`
- role: bleed scaling amplifier

Effect direction:

- doubles all bleed damage dealt by the build
- multiple copies can stack
- total amplification must cap at `x6`

Design purpose:

- provides the vertical scaling layer that makes bleed worth building around in later content
- should be the main reason bleed can remain relevant into higher-health waves without moving the scaling onto enemy max-health formulas

Implementation note:

- each copy doubles final bleed damage dealt by the build, but the total final bleed multiplier clamps at `x6`
- this must remain readable in UI because additive and multiplicative interpretations produce very different outcomes

##### Siphoning Knife

- rarity: `legendary`
- type: `utility-keystone`
- role: completed knife-package finisher

Activation rule:

- gains its defining effect while `The Knife` is socketed inside `Bloodbound Sheath`

Effect direction:

- `The Knife` and knife-sourced bleed gain life leech equal to `50%` of damage dealt
- `The Knife` gains an additional `x2` damage multiplier

Design purpose:

- turns the assembled knife shell into a self-sustaining late-game payoff engine
- creates a satisfying final package where the same core weapon both stacks wounds and helps the `pixl` survive sustained pressure

##### Bleed-package dependency rule

This package introduces a new type of named loadout dependency.

Current direction:

- `combined with` should mean the named item must satisfy the explicit package rule attached to that effect
- for the knife package, that rule is socketing, not adjacency
- `The Knife` is the anchor piece and `Bloodbound Sheath` is the socket piece
- `Siphoning Knife` checks whether the knife package is assembled, not whether specific pieces are touching each other
- the dependent item should still function at a baseline without the combo piece unless explicitly marked otherwise
- the combo bonus should be visible in the loadout UI so the player can tell when the condition is active

This needs to be treated as an explicit system rule, not hidden flavor text.

##### Bleed readability direction

- enemies with stored bleed should visibly fill with red to show wound pressure building over time
- that red fill should reflect stored bleed as a proportion of the enemy's max health
- at a glance, the player should be able to tell when a target is approaching hemorrhage-burst threshold
- the fill should read as an internal blood charge, not as a replacement for the normal health bar

Locked rule interpretation:

- `The Knife` bleed scales from final modified direct-hit damage
- `Hemorrhage Burst` consumes all currently stored bleed on rupture
- hemorrhage explosion size should stay tight and readable because its primary value is seeded wound spread, not full-screen immediate damage
- `Blood Catalyst` doubles bleed damage per copy but clamps at `x6` total final multiplier
- `Bloodbound Sheath` boosts `The Knife` direct-hit damage by `x5` while socketed
- `Siphoning Knife` grants `50%` life leech and an additional `x2` damage multiplier to the assembled knife package
- combo conditions for the knife package require socketing and assembled-state checks, not adjacency

#### Shared-pool implementation philosophy

The first implementation pass should not attempt to add every concept at once.

The best near-term target is a tightly curated shared pool of roughly `12` to `16` items that:

- fill weak rarity bands across campaigns
- support recognizable archetypes
- increase pack variety
- reduce repeated outcomes from overly small high-rarity pools
- keep campaign-specific signature weapons special

Shared-pool additions should act as connective tissue between campaigns, not as a replacement for campaign identity.

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

#### Drop cadence and roll model

The reward cadence should stay tied to full level completion.

Design rule:

- a pack drop check happens only when a level is fully cleared
- rewards should not roll per enemy kill
- the player should receive a card-pack style reward instead of isolated item drops

The current independent-per-item drop model creates too many rewards once the player reaches mid and late progression.

That high frequency is helpful in the early game, but it makes build growth too fast after the player already has a stable inventory base.

The intended replacement model is:

1. clear a full level
2. run one controlled pack-drop evaluation for that level
3. if the level awards a pack, store the sealed pack immediately
4. open the pack later through the dedicated `Packs` route
5. grant the already-rolled contents to inventory in one atomic open transaction

Current first-pass pack-drop rules:

- ordinary clears currently roll a `15%` chance for one standard pack
- boss clears currently roll a `30%` chance for one standard pack
- stages `4-5` also roll a second special-pack check
- that special-pack check uses a `5%` base chance on ordinary clears and `10%` on boss clears
- special packs guarantee `1` `exotic` or `legendary` slot
- new accounts currently start with `1` unopened starter pack

This means the system should move from:

> every eligible weapon rolls its own chance

to:

> the level rolls one bounded pack outcome

#### Pack identity and shared ownership

Packs are now account-wide reward objects, not campaign-owned loot containers.

Current design rules:

- every pack now opens from the same shared reward pool
- the reward pool is no longer filtered by the active campaign route
- unopened packs are visible from the `Packs` route regardless of where they dropped
- packs still retain `sourceCampaignLevel` for provenance and presentation
- the reward should feel like opening a themed set of cards rather than receiving one loose weapon instance
- the presentation should lean into the existing collectible-card feel of the item art and UI

This gives stronger variety and removes the old campaign-silo duplication problem:

- late campaigns stop flooding the player with the same narrow campaign-local card sets
- shared archetype packages can actually surface often enough to matter
- opening rewards becomes a more satisfying event than silently appending another item to inventory

#### Pack rarity and contents

Each pack should currently contain `5` cards.

Pack structure:

- standard packs roll all `5` cards from the shared eligible pool using the current rarity weights
- special packs roll `4` standard cards plus `1` guaranteed high-rarity slot

Core rule for the guaranteed slot:

- only special packs guarantee `1` `exotic` or `legendary` card
- the guaranteed slot currently splits `50 / 50` between `exotic` and `legendary`

This guaranteed high-rarity slot is important because special pack openings should feel like a distinct reward spike.

Both pack types can still include lower-rarity items or duplicates, and standard packs can still randomly roll any eligible shared-pool definition.

Design intent:

- the pack itself is the top-level reward outcome
- the contents are then generated from the current shared eligible item pool
- the guaranteed `exotic` / `legendary` slot should define the emotional floor of the reward

#### Pack opening surface

Pack rewards should not open as a tiny inline popup.

The game should add a dedicated `Packs` route or tab where unopened packs can be viewed and opened intentionally.

Design intent:

- unopened packs should accumulate as inventory objects until the player chooses to open them
- the player should be able to batch-open selected packs as well as reveal single packs
- pack opening should feel like a discrete reward ritual rather than background admin
- the route should support both one-by-one reveal pacing and bulk-open summaries

This means pack rewards create a new management surface:

- combat earns packs
- the `Packs` tab stores and presents unopened packs
- opening a pack converts that reward object into owned item cards

#### Preferred persistence model

The preferred implementation model is:

- packs are stored as sealed reward objects in persistence
- pack contents are rolled at pack drop time, not at pack open time
- opening a pack reveals already-determined contents rather than generating new outcomes

This is preferred because it:

- prevents reroll exploits
- keeps reward generation server-authoritative
- preserves historical reward integrity if balance tables change later
- makes pack opening a presentation step rather than a second randomization step

Preferred pack record fields:

- `id`
- `ownerUserId`
- `campaignId` (currently retained as legacy source metadata, but no longer used for access or pool selection)
- `sourceCampaignLevel`
- `droppedAt`
- `openedAt` or `null`
- `status`: `unopened` or `opened`
- `cardCount`
- `guaranteedSlotIndex`
- `contentVersion`
- `cards`: resolved sealed card results

Preferred stored card fields:

- `slotIndex`
- `definitionId`
- `rarity`
- `isGuaranteedSlot`

Important rule:

- store the fully resolved card outcomes, not just the pack odds or rarity requests

That means an unopened pack should already know exactly which cards it contains.

#### Preferred open transaction model

The preferred open flow is:

1. the player chooses an unopened pack in the `Packs` tab
2. the server verifies that the pack belongs to that user and is still unopened
3. the server grants all sealed card rewards to inventory in one atomic transaction
4. the server marks the pack as opened
5. the client receives the sealed contents for the reveal sequence and final summary

This means the items become owned at open time, not at drop time.

That is preferred because it:

- keeps unopened packs meaningful as unopened rewards
- avoids cluttering inventory with items the player has not revealed yet
- makes `new` markers easier to reason about during the reveal flow
- avoids edge cases where inventory and unopened pack state disagree

Important implementation rules:

- pack generation should be server-side only
- pack opening should be idempotent
- repeated open requests must not duplicate rewards
- unopened packs should keep their original sealed contents even if future balance patches change drop rules

#### Pack opening presentation

Pack opening should include a short reveal animation.

The goal is not to create a long skippable cutscene.
The goal is to make each pack feel ceremonial, readable, and worth anticipation.

Presentation rules:

- opening should begin with a pack-focused animation or burst
- cards should reveal one by one
- each click should shuffle to the next card reveal
- the guaranteed `exotic` / `legendary` slot should be visually saved for a stronger beat in the sequence
- rarity should be obvious before or during full card reveal through color, glow, frame treatment, or motion
- the sequence should be short enough to remain satisfying when opening multiple packs in a session
- explicit skipping is not a separate control; advancing is done by clicking through the sequence
- after the final card reveal, the player should see a summary of all opened cards before closing
- cards that the player has never owned before should receive a `new` marker in the reveal and summary flow

Design intent:

- keep the collectible-card fantasy front and center
- make the high-rarity slot emotionally legible
- turn reward pacing into a positive moment instead of a silent inventory append
- avoid making repeated pack opening feel tedious

#### Eligible item selection

Pack contents should still come from the current campaign's eligible pool.

Eligibility should continue to respect:

- campaign membership
- stage gates where relevant
- item availability rules such as disabled or placeholder content

Current content rules:

- a Campaign `1` pack can only open into Campaign `1` weapons
- a Campaign `4` pack can only open into Campaign `4` weapons
- pack contents are rolled at pack drop time, not at pack open time
- duplicate cards inside a pack are currently prevented
- the `4` normal slots can roll any rarity
- the `4` normal slots should use rarity weighting so lower rarities appear more often than higher rarities

Current normal-slot rarity weighting direction:

- `normal`: `5x`
- `magic`: `4x`
- `rare`: `3x`
- `exotic`: `2x`
- `legendary`: `1x`

This means normal slots are still capable of producing exciting outcomes, but the pack's guaranteed high-rarity slot remains the main excitement anchor.

Selection should then use authored per-item chances or weights inside the pack-generation rules.

This means the main balancing knobs become:

- whether a level awards a pack at all
- how many cards appear in a pack
- how the guaranteed `exotic` / `legendary` slot is resolved
- how likely each specific item is inside its eligible campaign pool

This keeps reward rolls stable while allowing fine-grained tuning at both the pack level and the item level.

#### Frequency control goals

The new pack model should explicitly target lower overall reward frequency than the current system.

Goals:

- early levels should still provide enough rewards to teach the loot loop quickly
- mid game should stop flooding the player with constant item injections
- late game should feel paced by pack excitement and build choices, not inventory bloat
- progression should become harder to brute-force through raw reward frequency alone

The key balancing lever should be:

- one controlled level-clear pack roll with authored pack odds and authored item odds inside the eligible campaign pool

not:

- many simultaneous item-specific rolls every time a level ends

#### Remaining open questions

These points still need explicit cleanup or balancing decisions:

- whether stage gating inside a campaign should remove some weapons from early pack openings
- whether the reward-pack pool should remain fully shared or become more tightly campaign-authored
- how far route-level notifications should distinguish sealed-pack drops from revealed card gains
- how aggressive the final pack-drop odds should be once reward pacing is fully rebalanced

#### Current implementation state

- unopened and opened packs are stored as first-class persisted records
- level clear now awards sealed packs instead of direct item drops
- pack contents are rolled at drop time and opened atomically later
- the `Packs` route exists as a dedicated management surface
- packs can be opened individually or in bulk
- reveal and summary flows are already implemented, including `new` markers
- notification and route wiring already understand unopened packs as a real progression surface

#### Remaining cleanup and polish

- confirm and stabilize pack persistence during arena-to-route handoff, especially when the player already has unopened packs
- keep tuning rarity weights, guaranteed-slot odds, and drop frequency around the sealed-pack model rather than the old direct-drop model
- decide the final presentation split between sealed-pack notifications, reveal summaries, and recent-feed history
- review whether campaign identity inside pack contents needs to be tighter than the current shared reward pool
- continue improving bulk-open readability so repeated pack provenance remains clear without looking buggy

- verify that pack frequency and item gain actually slow down mid and late game progression

Implementation tasks:

- measure pack drop feel in Campaign `1` early progression
- verify the `5% / 10%` and `10% / 20%` campaign rules are sparse enough
- check whether the guaranteed high-rarity slot overfeeds `legendary` inventory because of the current `50 / 50` split
- tune per-item authored chances after real playtests

Preferred outcome:

- pack rewards feel exciting without restoring the old reward flood problem

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
- `Packs`: unopened pack inventory and pack opening sequences
- `Stats`: persistent progression and perk spending
- `Management`: campaign overview and stage-level progression context

Important V1 UI behaviors already achieved:

- arena remains centered and combat-first
- stats are available without abandoning the run
- stage selection can be opened from the arena
- loadout editing can coexist with a continuing run preview
- nav badges surface unread perk points and newly acquired weapon types

Important next-step UI behavior:

- pack rewards should live on their own route surface rather than interrupting arena flow immediately

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

- Campaign `4` is still incomplete as a full control-combo roster
- enemy behavior is broader than the original melee-only baseline, but encounter logic is still fairly simple
- status packages and named synergies now exist, but only a few of them have real roster density
- targeting behavior is not yet a player-controlled system
- build diversity is now partly rule-system-driven, but several archetypes still need deeper support
- long-term motivation beyond clearing harder content is still limited
- the duplicate economy now exists, but still needs more depth, sinks, and polish
- balance is functional but still early

These are acceptable V1 limitations.

---

## Milestone overview

The next phase should build depth on top of the stable loop, not replace it.

This roadmap is ordered by implementation priority, not by brainstorm category.

### Milestone 0: V1 foundation complete

This milestone is already proven in the current build.

What is already working:

- centered idle arena combat
- local level-reset failure
- permanent XP progression with perk spending
- shape-based loadout building
- route-based management surfaces
- stage selection from the arena flow
- live overlay-driven arena UI

This means the project no longer needs base-loop rediscovery work.

### Milestone 1: dungeons

This is now the biggest missing feature in the project.

Goal:

- add a separate side-progression lane with its own entry rules, run structure, and rewards

Required outcomes:

- define how dungeons unlock and how keys are earned or consumed
- build the dungeon access flow and campaign-shell navigation
- define dungeon-specific progression, scaling, and fail-state rules
- add dungeon-exclusive rewards that justify the mode existing beside campaigns and endless
- make the dungeon loop legible as a major feature rather than a one-off side room

Exit criteria:

- dungeons feel like a real parallel progression system
- dungeon rewards are meaningfully distinct from standard campaign rewards
- the feature is large enough to function as the next major content pillar after the current campaign set

#### Dungeon role in the game

Dungeons should be the most active gameplay loop in `pixlvl`.

The rest of the game can remain strongly idle or semi-afk, but dungeons should be the payoff mode that asks the player to pay closer attention and make more moment-to-moment decisions.

Design intent:

- campaigns remain the steady progression ladder
- endless remains the long-run scaling and endgame pressure lane
- dungeons become the high-attention payoff activity that breaks up otherwise passive progression

This means dungeons should feel more demanding, more eventful, and more hand-authored than standard campaign runs.

#### Dungeon access model

Dungeons should require keys.

Core access rules:

- a dungeon run can only be started by consuming a matching dungeon key
- dungeon keys are consumables, not permanent unlock tokens
- each dungeon entry costs exactly `1` matching key
- the key is consumed immediately when the run begins
- each real campaign should have its own key drop
- Campaigns `1` through `5` should therefore each feed one dungeon access path
- endless mode should not have its own dungeon key because it is not part of the finite campaign ladder

This produces a clean source-to-destination structure:

- Campaign `1` drops the key for Dungeon `1`
- Campaign `2` drops the key for Dungeon `2`
- Campaign `3` drops the key for Dungeon `3`
- Campaign `4` drops the key for Dungeon `4`
- Campaign `5` drops the key for Dungeon `5`

Design purpose:

- campaigns stay relevant even after the player has unlocked later systems
- dungeon access remains paced instead of being infinitely spammable
- each dungeon run has a real entry cost and reward expectation
- each dungeon naturally inherits progression placement from its parent campaign

#### Dungeon count and structure

The first dungeon release should contain `5` dungeons total.

Core structure rules:

- there should be exactly `1` dungeon tied to each of the `5` real campaigns
- each dungeon consists of a single stage
- each dungeon stage contains `5` levels
- each dungeon should culminate in a unique boss fight

This means each dungeon is shorter than a full campaign, but denser and more deliberate.

Pacing intent:

- a dungeon should feel like a concentrated challenge run rather than a second full campaign ladder
- the five-level structure is long enough to build tension and escalation
- the one-stage format keeps the mode readable and repeatable

#### Dungeon combat identity

Dungeons should not feel like recolored campaign levels.

Each dungeon should have:

- its own unique boss
- its own unique glitch or glitch family
- its own encounter identity
- a stronger atmosphere treatment than a normal campaign route

Encounter design rule:

- the boss should be the signature build-check and memory anchor for that dungeon
- the unique glitch should change how the run is played before the boss arrives
- dungeon mechanics should create more active player attention than the normal idle combat flow

Atmosphere rule:

- every dungeon route should use a visibly different background atmosphere layer
- a strong gradient treatment is the preferred baseline signal
- the player should be able to tell at a glance that they are inside a dungeon and not a standard campaign arena

The visual goal is not only polish.
It is mode clarity.

#### Dungeon rewards

Dungeon rewards should be exclusive.

Completion rule:

- completing a dungeon awards a new sealed reward pack named after that dungeon
- the pack naming format should be `[Dungeon Name] Pack`
- dungeon pack contents should come only from that dungeon's exclusive reward pool
- dungeon packs award `2` item drops per pack, not the normal `5` cards used by standard reward packs

Dungeon item marker rule:

- dungeon weapons and utilities should carry an `ancient` sub-marker
- `ancient` is used to show that these items are not part of the normal campaign or shop item bands
- an `ancient` item still keeps its base rarity such as `normal`, `magic`, `rare`, `exotic`, or `legendary`
- the `ancient` marker indicates that the item is a stronger dungeon-tier version of that rarity band rather than a standard item from the same rarity
- `ancient` is a visual subcategory only, not a separate rarity bucket for sorting or filtering
- if the player filters or groups by rarity, `ancient rare` should still appear under `rare`, `ancient magic` under `magic`, and so on

This means each dungeon becomes a targeted chase lane instead of another source of generic shared items.

#### Dungeon pack rarity model

Each dungeon pack should roll its `2` item drops using the following rarity rates:

- `25%` normal
- `30%` magic
- `20%` rare
- `15%` exotic
- `10%` legendary

Design implications:

- dungeon packs should feel richer and more exciting than ordinary campaign packs even though they contain fewer total drops
- `magic` and above should dominate the expected reward texture
- the `10%` legendary rate is high enough to make dungeon completion feel special without making legendary rewards routine everywhere else

Guardrails:

- dungeon-exclusive rewards should not dilute the identity of standard campaign or endless rewards
- dungeon packs should stay exclusive to successful dungeon completion
- dungeon loot should be strong enough to justify the active-play demand and key cost
- the lower `2`-drop pack size should help keep dungeon rewards punchy and curated instead of turning them into another high-volume loot source

#### Dungeon implementation priorities

The first dungeon implementation pass should answer these concrete questions:

- what the five dungeon names and themes are
- what key drop rules each source campaign uses
- what the five unique dungeon glitch types or glitch packages are
- what the five unique dungeon bosses are
- what each dungeon-exclusive loot pool contains
- how dungeon difficulty and reward pacing scale relative to their source campaigns

The main principle is simple:

> campaigns build the account, dungeons cash in that power through active play, and dungeon packs deliver exclusive payoff.

#### Dungeon route model

Each dungeon should live on its own dedicated subpage rather than being hidden only inside the standard campaign arena route.

Core route rules:

- each dungeon should have an individual route entry
- the route should act as a dungeon hub and staging page before the active fight begins
- the page should visually foreground the dungeon fantasy instead of looking like a plain menu

Dungeon `1` page direction:

- the subpage should present the player inside a ruin arena space
- it should contain `5` circular doors representing the `5` dungeon floors
- doors begin locked and are opened by spending the matching dungeon key for the run
- once opened, the player should be able to continue into the next floor of the dungeon
- if the player dies during the run, the spent key is lost, the run ends immediately, and the player is thrown out of the dungeon
- dungeon rewards are granted only after the full five-floor clear; partial runs pay out nothing

Design purpose:

- makes dungeon entry feel ceremonial and valuable
- turns keys into a visible unlock action instead of a hidden resource subtraction
- gives dungeon routes a stronger visual identity than ordinary campaign selection

#### Per-dungeon completion template

Dungeons should be designed and finished one at a time.

That is the preferred production model because each dungeon needs its own gameplay identity, reward identity, and aesthetic identity.

For a dungeon to count as fully defined, all of the following must be locked:

#### 1. Loot package

Each dungeon needs a complete exclusive loot pool with `13` total definitions.

Required rarity split per dungeon:

- `3` normal
- `4` magic
- `3` rare
- `2` exotic
- `1` legendary

Design rule:

- the pool should feel like a coherent package instead of a random mini-catalog
- the legendary should function as the capstone chase item for that dungeon
- the normal and magic items should establish the dungeon's basic mechanic shell
- the rare and exotic items should deepen the package into real build paths
- every item in the pool should be marked as `ancient` so the player can immediately recognize it as dungeon-tier loot

Presentation and balance rule:

- `ancient normal`, `ancient magic`, `ancient rare`, `ancient exotic`, and `ancient legendary` should all read as stronger than their standard counterparts
- this is a sub-marker layered on top of rarity, not a replacement for the existing rarity ladder
- the marker should be visible anywhere the item is surfaced: packs, inventory, tooltips, and reward summaries

Exit check:

- the dungeon has a full `13`-item exclusive reward pool with the locked rarity spread above
- every item in that pool has a clearly defined `ancient` identity and presentation treatment

#### 2. Core theme

Each dungeon needs a strong gameplay theme that is immediately legible.

Required definition work:

- what the dungeon fantasy is
- what combat problem the dungeon is built around
- what kind of active attention the player is expected to pay during the run
- how the dungeon differs from both its source campaign and the other dungeons

Design rule:

- the theme should affect both encounters and rewards
- if the dungeon theme does not change how the run feels, it is not strong enough yet

Exit check:

- the dungeon can be summarized in one clear sentence that explains its combat identity

#### 3. Unique enemies

Each dungeon needs unique enemies, not only recycled campaign pressure.

Required definition work:

- at least one unique glitch or glitch family
- the tactical role of that glitch
- how it pressures the player's build or attention differently from standard campaign enemies
- how it supports the dungeon's central theme

Design rule:

- the unique glitch should matter before the boss fight
- it should create the dungeon's baseline tension, not just act as a decorative extra

Exit check:

- the dungeon has a unique enemy package that meaningfully changes wave play before level `5`

#### 4. Boss

Each dungeon needs a unique boss that acts as the dungeon's signature build check.

Required definition work:

- boss fantasy and visual identity
- core mechanic
- what it tests in the player's build
- how it escalates the dungeon's unique enemy or theme rules instead of ignoring them

Design rule:

- the boss should feel like the final expression of the dungeon's theme
- it should not just be a campaign boss with bigger numbers

Exit check:

- the boss fight is mechanically distinct and clearly tied to the dungeon's identity

#### 5. Aesthetic package

Each dungeon needs its own visual atmosphere.

Required definition work:

- background gradient direction
- any secondary atmosphere treatment such as fog, haze, embers, scanlines, particles, or lighting shifts
- the dominant color language
- how the route visually signals danger, rarity, or mood before combat details are even parsed

Design rule:

- the dungeon should be visually recognizable from a screenshot
- gradients are the baseline signal, but additional styling should reinforce the theme where useful

Exit check:

- the dungeon has a locked aesthetic brief that can be implemented directly in route styling and arena presentation

#### Per-dungeon signoff rule

We should not consider a dungeon finished until all five of these are defined:

- exclusive `13`-item loot package
- core gameplay theme
- unique enemy package
- unique boss
- locked aesthetic treatment

This keeps the dungeon pipeline clear:

> define one dungeon completely -> validate that its rewards, encounters, and visuals all reinforce the same theme -> then move to the next dungeon.

#### Dungeon 1: Ancient ruins

Dungeon `1` should be the first fully defined dungeon and the baseline template for the rest.

Current locked direction:

- theme: ancient ruins
- visual inspiration: old temple and ruin spaces with an Aztec or Maya-like stone-civilization feel
- item marker: all rewards are still dungeon-tier `ancient` items

##### Core theme

Dungeon `1` should feel like a forgotten ruin complex that has been reactivated by glitch corruption.

Combat identity:

- the run should feel old, heavy, ritualistic, and dangerous
- the dungeon's weapons should feel like relics, temple mechanisms, cursed idols, stone constructs, solar beams, or ritual traps rather than improvised tech
- the dungeon should establish the idea that dungeon rewards are stronger, older, and more mythic than the normal campaign weapon pool

One-sentence identity:

> Dungeon `1` is the ancient-ruins dungeon where relic weapons, temple traps, and ritual pressure turn the run into a deliberate mythic gauntlet rather than a normal campaign clear.

##### Weapon style direction

Dungeon `1` weapons should fit the ancient-ruins theme directly.

Weapon style rules:

- names should sound like relics, idols, rites, obelisks, altars, runes, stone mechanisms, sun devices, serpent motifs, or temple guardians
- silhouettes should feel carved, ritualized, geometric, or monumental rather than industrial or modern
- effects should lean toward stone, jade, gold, solar fire, cursed rune energy, trap pulses, collapsing force, or sacred-beam motifs
- even the lower-rarity dungeon items should look authored as ancient artifacts rather than ordinary weapons with a skin change

Thematic examples of the right flavor:

- sun altars
- jade serpent launchers
- obsidian lances
- rune traps
- stone sentinel emitters
- ruin-beam relays

##### Core mechanic shell

Dungeon `1` should revolve around ancient constructs, ritual marks, and temple payoff windows.

Primary gameplay rule:

- this dungeon should reward the player for setting up marked zones and then cashing them out at the right moment

The intended feel is more active than normal idle play:

- the player should care about when threats are clustering inside ruin zones
- the player should care about whether temple effects are primed before the biggest pressure wave arrives
- the dungeon should create obvious payoff moments where a prepared board converts setup into a heavy relic burst

Core system direction:

- some Dungeon `1` weapons should place runes, seals, idols, or temple zones
- some should strengthen, echo, or charge those marked zones
- some should detonate, collapse, beam through, or otherwise cash out those prepared zones for major payoff
- the full package should feel like building and triggering an ancient mechanism rather than simply firing standalone weapons on cooldown

Combat identity rule:

- the dungeon should create ritual pressure, not generic sustained DPS
- weaker enemies should help prime or feed the setup space
- tougher enemies should test whether the player can hold them inside the payoff window long enough to convert the setup

Active-attention rule:

- Dungeon `1` should ask the player to watch for setup and payoff timing more than a normal campaign run does
- the mode should feel best when the player notices a cluster, sees the ruin engine come online, and watches a deliberate burst sequence resolve

Weapon-package rule:

- the `3` normal and `4` magic items should mostly establish the rune, relic, and zone-setup shell
- the `3` rare items should introduce the first real payoff and chaining pieces
- the `2` exotic items should create strong board-shaping or ritual-conversion moments
- the `1` legendary should act as the final temple-engine capstone that makes the whole package feel mythic

This gives Dungeon `1` a clean mechanical identity:

> mark the ruin space -> charge the ritual shell -> hold enemies in the kill zone -> cash out with ancient payoff bursts.

##### Aesthetic package

Dungeon `1` should use a green-stone ruin palette.

Locked color direction:

- primary tones: moss green, jade green, desaturated jungle green
- secondary tones: stone grey, weathered slate, temple dust, muted limestone
- accent tones: small amounts of aged gold, dim turquoise, or solar amber where ritual energy needs contrast

Background and atmosphere rules:

- the arena background should use a strong green-grey gradient as the baseline signal
- the route should feel like a temple ruin chamber rather than an open field or abstract void
- gradients can be layered with faint stone texture, carved-pattern silhouettes, ruin haze, drifting dust, or low ritual glow
- atmosphere should feel humid, ancient, and dormant-but-awake rather than fiery, mechanical, or cosmic

Screenshot test:

- if the player sees the arena without UI context, they should still read it as ancient ruins immediately

##### Unique glitch package

Dungeon `1` should use a ruin-themed enemy package built around heavy frontliners, supporting backliners, and sudden melee rush pressure.

Locked unique enemies:

- `Golems`
- `Sunpriests`
- `Soldiers`

###### Golems

Role:

- large slow-moving frontliner

Behavior direction:

- very high health
- high contact damage
- slow movement speed
- functions as the dungeon's main wall unit that occupies space and forces sustained answers

Design purpose:

- golems create the feeling of ancient stone guardians pushing forward relentlessly
- they hold the front line long enough for support enemies and faster threats to matter
- they test whether the player's build can break durable ruin defenders before the rest of the wave compounds behind them

###### Sunpriests

Role:

- ranged support enemy

Behavior direction:

- attacks from range
- prioritizes healing enemies in the front ranks
- should prefer high-value long-range support positioning instead of walking into the frontline early

Design purpose:

- sunpriests reinforce the temple and ritual identity of the dungeon
- they make golems and other front pressure units harder to clean up efficiently
- they create a clear priority-target problem because leaving them alive prolongs the whole wave

###### Soldiers

Role:

- fast melee pressure enemy

Behavior direction:

- unusually high movement speed
- hard-hitting melee contact damage
- reaches the pixl much faster than the dungeon's other frontline units

Design purpose:

- soldiers stop the dungeon from becoming only a slow attrition check
- they create sudden pressure windows that force the player to respect leaks and timing
- they make the active-play identity stronger because the wave is not only about slowly grinding down stone tanks

##### Dungeon 1 wave composition

Dungeon `1` should mix its unique ruin enemies with selected baseline swarm and ranged pressure.

Core wave composition:

- golems as the main heavy frontline
- soldiers as the fast melee punish unit
- sunpriests as the healing backline support
- swarmers as supplemental pressure and spacing disruption
- standard ranged enemies as additional backline threat

Composition identity:

- golems hold space
- sunpriests extend frontline durability
- soldiers punish weak leak control
- swarmers and ranged units stop the run from becoming a single-lane boss check

This should create a good layered wave profile for Dungeon `1`:

- durable front pressure
- meaningful backline priority targets
- fast melee panic moments
- enough ambient swarm and ranged pressure to keep the run active

Player-facing combat read:

- kill or reach the sunpriests before they keep the frontline alive too long
- survive soldier leak windows
- maintain enough sustained damage to break golems before the arena clogs

This gives Dungeon `1` a cleaner enemy-side identity:

> stone tanks hold the line, sunpriests sustain the push, and fast soldiers punish any lapse in control.

##### Boss: The High Priest

Dungeon `1` should end with `The High Priest` as its unique boss.

Visual identity:

- the boss should have a tall vertical-rectangle silhouette
- it should read as a ritual authority figure rather than a beast or brute
- the shape should feel like a moving carved idol, priestly monolith, or temple avatar

Core role:

- ranged boss with heavy sustain support

Primary attack:

- the high priest attacks with a solar beam
- the beam should deal high persistent damage to the pixl
- the attack animation should read as a beam cast down from above the top of the screen onto the pixl
- the visual should feel ceremonial and punishing, as if the boss is calling down temple light rather than firing a normal projectile

Support behavior:

- the high priest also heals frontline enemies
- it should use the same general front-rank healing idea as the sunpriests
- its healing output should be much higher than a normal sunpriest's healing
- this should make the boss fight feel like a true escalation of the dungeon's sustain pressure rather than a separate unrelated encounter

Build-check identity:

- the fight tests whether the player can survive sustained solar beam pressure
- the fight tests whether the player can break through heavily healed frontline units fast enough
- the fight should force the player to respect both incoming boss damage and the extended life of the boss's supporting frontline

Design purpose:

- the high priest is the natural capstone of the ruin enemy package
- golems create the body wall
- sunpriest-style healing scales up into boss-tier sustain
- the solar beam gives the fight a stronger direct threat than the normal support enemies provide

Player-facing combat read:

- if the frontline stays alive too long, the boss becomes much harder to reach or kill
- if the player cannot withstand the solar beam, the fight collapses even if add clear is acceptable
- the encounter should feel like breaking a protected temple command unit under constant sacred fire

This gives the dungeon boss a clear identity:

> the high priest stands behind the ruin frontline, calls solar judgment down onto the pixl, and massively prolongs the enemy wall through superior healing.

##### Dungeon 1 floor progression

Dungeon `1` should stay relatively close to the normal wave-scaling model rather than becoming a wildly inflated side mode.

Scaling rule:

- start from a small opening floor of `50` enemies
- increase enemy count by roughly `20%` per floor
- on the final floor, apply an additional natural `20%` bump on top of that escalation before the boss layer is accounted for
- the boss itself should then carry the real final-floor difficulty through very high health and sustained beam pressure

Pacing rule:

- use `totalEnemies / spawnRatePerSecond` as the first pacing proxy
- normal dungeon floors should stay below the `120` second outer bound
- the boss floor can run close to the cap, but should still respect it in real play

Recommended first-pass floor numbers:

- Floor `1`: `50` enemies at `0.56` spawn rate per second
- Floor `2`: `60` enemies at `0.63` spawn rate per second
- Floor `3`: `72` enemies at `0.72` spawn rate per second
- Floor `4`: `86` enemies at `0.82` spawn rate per second
- Floor `5`: `124` support enemies at `1.06` spawn rate per second, plus `The High Priest` boss

First-pass pacing proxy:

- Floor `1`: `50 / 0.56 = 89.3` seconds
- Floor `2`: `60 / 0.63 = 95.2` seconds
- Floor `3`: `72 / 0.72 = 100` seconds
- Floor `4`: `86 / 0.82 = 104.9` seconds
- Floor `5`: `124 / 1.06 = 117` seconds before factoring the boss's remaining life window

This keeps the ordinary spawn flow inside the established cap while still letting the final floor feel dense and dangerous.

Floor identity:

- Floor `1` should introduce the ruin mood with a light mix of swarmers and early soldiers, while golems appear in small numbers as clear elite bodies
- Floor `2` should introduce consistent sunpriest support so the player starts recognizing backline healing as a core dungeon rule
- Floor `3` should become the first true layered floor where golems, soldiers, and sunpriests all matter at once
- Floor `4` should pressure leak control and target priority harder by increasing soldier surges behind sturdier golem fronts
- Floor `5` should open with a reinforced ruin frontline, then transition into the High Priest encounter as the capstone sustain-and-beam check

Final-floor structure:

- the final floor should not spawn the boss alone in an empty arena
- the High Priest should arrive with or behind a real supporting frontline
- golems should act as the main body wall on the boss floor
- sunpriest-style sustain should already be established before the boss appears so the healing escalation is readable
- soldiers should remain dangerous enough that the player cannot tunnel only on the boss beam and ignore leaks

Boss health direction:

- the High Priest should have very high health relative to the dungeon's normal enemies
- the fight's difficulty should come from both boss durability and the fact that its healing prolongs the frontline body wall
- the first-pass boss health target should be high enough that the fight reads as a real dungeon capstone, not a slightly stronger ranged elite

Recommended first-pass health anchor:

- treat the floor `5` golem as the normal-wave health anchor for the dungeon
- set the High Priest at roughly `14x` to `18x` that floor `5` golem health on the first balancing pass
- start near the middle of that band unless playtests show the sustain pressure is already doing too much work alone

This means Dungeon `1` now has a defined encounter pattern:

> start with moderate ruin pressure -> layer in healing support -> raise soldier leak threats -> finish on a dense frontline protecting a high-health solar-beam boss.

##### Ancient weapon package

Dungeon `1` now needs an ancient weapon package built around spell-casting runes and serves as a post-clear reward set.

Core package goals:

- create rune-casting build paths that feel magical, ancient, and ceremonial
- split the package roughly in half between rune-focused weapons or utilities and generally strong standalone weapons
- make dungeon rewards feel stronger and more mythic than standard gear at the same base rarity
- make the dungeon clear feel worth chasing even though the player must beat the dungeon first with their existing inventory
- open new build directions for later campaigns, later dungeons, and endless play rather than acting as the intended starter solution to Dungeon `1`

All items in this package are `ancient` dungeon-tier items.

Progression rule:

- the player is expected to clear Dungeon `1` with an already functional build made from existing non-dungeon gear
- Dungeon `1` ancient items are awarded only after successful clears through `Dungeon 1 Pack` rewards
- these items should therefore be designed as powerful chase rewards, not as mandatory answers the player must already own to beat the dungeon

Core presentation rule:

- the ancient-ruins package should now be built around spell-casting runes
- the baseline animation language should show the active rune appearing above the pixl before the spell is cast
- the rune display should be a major part of the package identity, so the player clearly reads these items as ritual spell weapons rather than ordinary projectiles or traps

Shared rune-state rule:

- when a rune weapon is triggered, that rune should count as `triggered` for the rest of the current sweep cycle
- other follow-up weapons later in the same cycle can then check which runes have already been triggered
- this allows the package to create combo effects based on rune order and rune sequencing within the cycle
- the triggered-rune state should reset when the sweep cycle resets

Timing rule:

- for the rune package, `1 turn` should be treated as `1` full sweep cycle unless a weapon explicitly says otherwise

#### Ancient normal weapons

##### Sun Rune

- rarity: `ancient normal`
- role: general-purpose damage rune
- behavior direction: shows a solar rune above the pixl, then places a glowing ruin rune on the ground that pulses light damage in a small area for a short duration

- purpose: establishes the dungeon's core idea of visible rune casting while still being a simple general-purpose damage spell

##### Healing Rune

- rarity: `ancient normal`
- role: pixl sustain rune
- behavior direction: shows a restoration rune above the pixl, then releases a healing rune effect that restores pixl health
- purpose: gives the rune package a clean sustain spell that immediately reads as ancient support magic

##### Slowing Rune

- rarity: `ancient normal`
- role: slow and debuff rune
- behavior direction: shows a control rune above the pixl, then sends out a lightwave around the pixl that applies a slowing debuff to enemies for a duration
- purpose: gives the package an early crowd-control rune that fits the visible spell-casting identity

#### Ancient magic weapons

##### Idol of Echoes

- rarity: `ancient magic`
- role: rune amplifier
- behavior direction: boosts active runes so nearby rune spells echo an additional pulse or repeat their payoff once
- purpose: upgrades the basic rune shell without needing a full payoff engine yet

##### Sunbrand Rune

- rarity: `ancient magic`
- role: delayed burst rune
- behavior direction: shows a solar rune above the pixl, then sends out a lightwave around the pixl that applies a sun brand debuff to glitches; when a branded target next takes direct damage, the rune triggers and deals high damage
- purpose: adds a more explosive rune payoff that still works with any direct-damage follow-up, not only other rune spells

##### Stone Ward

- rarity: `ancient magic`
- type: `utility`
- role: defensive wall utility
- behavior direction: summons a rock-textured wall ring or shield barrier around the pixl with health equal to `20%` of the pixl's max health
- purpose: gives the package a clearly visible ancient defensive tool and lets the ruin theme show through stone-like pixl-art construction

##### Binding Rune

- rarity: `ancient magic`
- role: persistent scaling rune
- behavior direction: shows a binding rune above the pixl, then sends out a lightwave around the pixl that marks enemies hit with a persistent rune effect lasting until they die
- effect rule: each consecutive direct hit against a marked target is multiplied by `x1.33`, causing damage against that specific target to ramp upward hit by hit until the target is killed
- purpose: gives the package a strong single-target scaling rune without relying on root or bind control

#### Ancient rare weapons

##### Rune Reiterator

- rarity: `ancient rare`
- role: cycle replay payoff spell
- behavior direction: when triggered, Rune Reiterator checks which runes have been triggered since that same Rune Reiterator last activated and then rapidly replays those rune effects one after another in quick succession
- combo rule: it replays every eligible rune that fired in between its own triggers, not only the current sweep
- purpose: turns the shared triggered-rune state into a real payoff mechanic and rewards deliberate cycle sequencing instead of only raw stat scaling

##### Ascendance Rune

- rarity: `ancient rare`
- role: multi-rune ascension buff
- shape:
  `x-xx-x`
  `xxxxxx`
- trigger rule: it only activates if `4` different runes have already been triggered in the current sweep cycle
- behavior direction: when the condition is met, Ascendance Rune grants a major ritual buff instead of a normal direct attack spell
- buff effect: fully heals the pixl, then doubles the damage of all weapons for `2` cycles
- cooldown rule: after activating successfully, Ascendance Rune goes on a `4` cycle cooldown
- purpose: rewards building toward a broad rune package instead of only repeating one strong spell, and gives the set a major comeback or power-spike moment

##### Judgment Rune

- rarity: `ancient rare`
- role: rune cash-out finisher
- shape:
  `xxx`
  `xxx`
  `x--`
  `x--`
- trigger rule: it activates once every `3` cycles and scales from the number of runes already triggered in the current sweep cycle
- behavior direction: shows a judgment rune above the pixl, then conjures an orbiting solar sphere around the pixl that burns glitches caught in its perimeter as it circles
- overlap rule: only `1` Judgment Rune sun can be active at a time; if it triggers again while the sun already exists, the same orb can only refresh or extend if at least `5` runes were triggered before the cast, otherwise the existing orb simply continues unchanged
- consume rule: after the spell resolves, it consumes all currently triggered runes for the rest of that cycle
- duration rule: the sun lasts for `1` base cycle plus `1` additional cycle for each unique rune already triggered before the cast
- damage rule: the sun deals `3` damage every `0.1` seconds to glitches inside its orbiting perimeter, gains `+0.3x` damage for each rune already triggered before the cast, then gains `+2` base damage after each full sweep cycle up to a base-damage cap of `9`
- purpose: gives the package a clean sacrificial finisher that turns stored cycle setup into one large payoff instead of another replay or buff effect

#### Ancient exotic weapons

##### Vanish Rune

- rarity: `ancient exotic`
- type: `utility`
- role: intangibility utility rune
- trigger rule: it requires `2` unique runes to have already triggered before it can activate
- behavior direction: when triggered, Vanish Rune makes the pixl intangible for `1` turn
- cooldown rule: after activating successfully, Vanish Rune goes on a `4` cycle cooldown
- gameplay rule: while intangible, no weapons in the loadout activate
- defence rule: while intangible, the pixl takes no damage and cannot be targeted by glitches or projectiles
- visual direction: enemy projectiles should pass through the pixl instead of colliding, and nearby glitches should stop advancing and drift or backtrack slowly backward while the intangibility window is active
- purpose: gives the rune package a high-skill defensive reset that trades one full turn of offense for complete short-window safety

##### Nature's Wrath

- rarity: `ancient exotic`
- role: sustain capture spell
- behavior direction: functions similarly to `Void Tendrils`, but instead of capturing multiple targets or converting them into temporary health, it uses one green tendril to grab a single enemy and channel restorative pulses outward to the edge of the screen
- healing rule: each pulse heals the pixl for `10%` of maximum health
- cadence: it pulses `2` times per second
- duration: the effect lasts for `3` cycles
- cooldown rule: after activating successfully, Nature's Wrath goes on a `2` cycle cooldown
- purpose: gives the rune package a stronger long-window sustain exotic that feels ancient, natural, and visually dramatic without overlapping the short safety role of Vanish Rune

Implementation status:

- now implemented as `natures-wrath`
- current behavior: captures `1` non-boss target, heals the pixl for `10%` max health every `0.5` seconds for `3` cycles, then consumes the captive and enters a `2` cycle success cooldown

#### Ancient legendary weapon

##### The Ascender

- rarity: `ancient legendary`
- type: `utility-booster`
- role: peashooter ascension legendary
- shape: `1x1`
- behavior direction: The Ascender transforms the `Peashooter` from its normal sweep-triggered projectile logic into a continuously firing lightning beam
- conversion rule: while The Ascender is active, the Peashooter no longer behaves like a normal intermittent starter weapon and instead uses beam logic continuously at all times
- uptime rule: the ascended lightning beam never goes on cooldown
- design purpose: gives the starter weapon a mythic endgame transformation and lets a humble baseline weapon become a permanent beam engine through dungeon-tier progression

Implementation status:

- now implemented as `the-ascender`
- current behavior: if at least one `Pea Shooter` is equipped, The Ascender suppresses its normal projectile fire and replaces it with a continuous lightning beam that retargets live enemies and ticks damage every `0.2` seconds

#### Package structure summary

The package should be read in layers:

- normals establish basic rune casting and visible spell setup
- magics strengthen rune repetition, rune payoff, and defensive utility
- rares should introduce the first strong payoff spells
- exotics should create the real rune-engine identity
- the legendary should unify the whole shell into a finished temple spell package

Progression summary:

- Dungeon `1` should be cleared first with the player's existing campaign-ready build
- the ancient ruin package is the reward for succeeding in that challenge
- these items should then strengthen the player's account for later dungeon clears, later campaigns, and endless progression

##### Remaining work to finish Dungeon 1

Dungeon `1` is now fully defined at the design level, including its complete rune reward package.

Design priority for the next pass:

- convert the final package into concrete item definitions, enemy stats, and encounter implementation values

### Milestone 2: finish the weapon milestone

The current roster is already broad, but the Season `1` weapon-definition target is still not finished.

Goal:

- complete the remaining roster work until the planned weapon milestone is actually reached

Required outcomes:

- close the gap to the `150` total loadout-definition target
- keep utilities counting toward the milestone alongside weapons
- preserve clear archetypes and synergy packages instead of filling the roster with stat-only padding
- continue reviewing weak, overlapping, or unclear items as the remaining definitions are added

Exit criteria:

- the Season `1` definition target is reached
- the added items deepen real build diversity instead of inflating counts only

### Milestone 3: daily quests

Daily quests are not the main expansion pillar, but they are a strong short-session progression boost.

Goal:

- add a lightweight recurring objective layer that rewards regular play without replacing the main progression ladder

Required outcomes:

- define a small set of repeatable daily objectives
- wire reward payouts into the existing progression economy
- keep the system readable, fast to claim, and useful for retention
- ensure daily quests complement campaigns, packs, shop progression, and upgrades rather than overshadow them

Exit criteria:

- daily quests create a meaningful login and progression nudge
- the rewards feel helpful without becoming mandatory or economy-breaking

### Milestone 4: endgame weapon system and Glitch Essence

The endgame weapon layer still needs to be sorted into a coherent system.

Goal:

- define and implement the late-game Glitch Essence economy and the weapon progression or unlock path attached to it

Required outcomes:

- decide exactly how `Glitch Essence` is earned from endless or other endgame play
- define what the endgame weapon system actually grants, unlocks, upgrades, or modifies
- connect `Glitch Essence` to a clear spend sink with real chase value
- ensure the endgame weapon system extends finished accounts instead of destabilizing campaign progression

Exit criteria:

- `Glitch Essence` has a stable source and a clear purpose
- the endgame weapon system is understandable, rewarding, and worth pushing endless for

### Milestone 5: broader systems depth and polish

These remain important, but they should follow the major missing systems above.

System priorities inside this milestone:

- enemy depth
- weapon identity and synergy
- long-term goals and progression loops
- balance pass
- combat readability and polish

Key directions:

- elite and support pressure tuning
- additional payoff and synergy hooks
- stronger duplicate-economy and shop follow-up depth
- pacing and reward readability improvements
- cleanup of unclear, stale, or redundant edge-case systems

Near-term note:

- prestige is still a valid long-term system, but it remains behind dungeons, the remaining weapon milestone, daily quests, and the Glitch Essence endgame layer

### Endless mode

`Endless mode` should be the first real endgame mechanic.

It should exist to answer one core problem:

- once a player finishes the campaign ladder, they need a place to cash in build strength without the game immediately needing full prestige

Primary purpose:

- provide a repeatable post-campaign challenge
- convert optimized builds into long-run `Glitch Essence` income
- unlock a second late-game chase economy through an endless-exclusive shop
- give late-game players a clean benchmark for build power beyond campaign completion

Endless mode should not replace the campaign ladder.
It should begin only after the player has already cleared the current finite content.

Unlock rule:

- endless mode unlocks after the player completes campaign `5`
- unlocking endless mode also unlocks a new endless shop with its own exclusive stock

Access model:

- endless mode should live inside the campaign shell as a special campaign-mode campaign rather than as a separate one-off container
- it should reuse the normal arena, loadout, and campaign-route surfaces where that keeps the experience consistent
- it should still behave differently from finite campaigns in progression and rewards
- the player should be able to start a fresh run at any time after unlock
- a run should always begin from wave `1`

Endless shop model:

- endless mode should unlock a second shop rather than only feeding the main campaign shop
- this endless shop should contain a fixed set of exclusive weapons or utilities that do not appear in the normal shop
- the endless shop inventory set can be static at first rather than timer-rotated
- its exact stock can be designed later, but it should represent the strongest chase tier in the game
- `Glitch Essence` should be the exclusive currency for this shop
- normal `Scrap` should not be used to buy from the endless shop
- `Glitch Essence` should come primarily or entirely from endless-mode performance

Core structure:

- endless mode is a single continuous run of escalating waves
- there is no final level cap
- each cleared wave immediately advances to the next wave
- the run ends only when the `pixl` dies
- death should record the highest cleared wave and end the run cleanly without deleting permanent account progress

Combat identity:

- endless should inherit the faster, higher-pressure expectations already established in the late campaigns
- it should feel like a post-campaign stress test, not like replaying campaign `1` with bigger numbers
- enemy variety should pull from the late-game roster and shared cross-campaign pressure pieces rather than from the full early roster indiscriminately

Wave composition model:

- normal waves should mix swarm, ranged, and tank pressure from an already-dangerous baseline
- every `5` waves should contain a boss or elite checkpoint
- every `25` waves should contain a major boss checkpoint intended to feel like a real run gate
- boss checkpoints should be the main source of run tension rather than making every normal wave excessively bloated

Scaling model:

- early endless waves should start around post-campaign power, not tutorial power
- endless enemy health should multiply by `1.2` each wave
- endless enemy damage should increase by a flat `+20` per wave after wave `1`
- endless spawn rate should multiply by `1.1` each wave
- endless wave size should multiply by `1.1` each wave
- this means each wave should scale from the previous wave rather than from the original baseline only
- the intended practical formula is:

$$
health(w) = baseHealth \times 1.2^{(w - 1)}
$$

$$
damage(w) = baseDamage \times 1.2^{(w - 1)}
$$

$$
spawnRate(w) = baseSpawnRate \times 1.1^{(w - 1)}
$$

$$
waveSize(w) = baseWaveSize \times 1.1^{(w - 1)}
$$

- practical checkpoints should look roughly like this relative to wave `1`:
- wave `10`: about `6.2x` health and damage, about `2.36x` spawn rate and wave size
- wave `20`: about `31.9x` health and damage, about `6.12x` spawn rate and wave size
- wave `30`: about `164x` health and damage, about `15.86x` spawn rate and wave size
- this should function as a hardcore stress test for the strongest builds rather than as a gentle infinite progression lane
- late endless difficulty should come from both brutal raw scaling and dangerous composition checks, not only from screen clutter

Practical scaling philosophy:

- waves `1-10` should already feel meaningfully harder than the campaign end state
- waves `11-25` should begin breaking incomplete builds through boss kill-speed and survivability checks
- waves `26+` should become an openly hostile attrition test where only optimized loadouts, upgrades, and chase items continue scaling

Run rewards:

- endless mode should primarily reward `Glitch Essence`
- `Glitch Essence` should be awarded in cumulative `10`-wave checkpoints
- clearing wave `10` should award `1` total `Glitch Essence`
- clearing wave `20` should award `3` total `Glitch Essence`
- clearing wave `30` should award `6` total `Glitch Essence`
- each new `10`-wave bracket should add one more `Glitch Essence` than the previous bracket
- this means the reward curve should follow triangular growth by completed `10`-wave milestones
- boss checkpoints should grant the largest payout spikes
- reward packs may appear in small amounts, but endless mode should not become the dominant source of pack flooding

Examples:

- wave `10`: `1`
- wave `20`: `1 + 2 = 3`
- wave `30`: `1 + 2 + 3 = 6`
- wave `40`: `1 + 2 + 3 + 4 = 10`

Reward intent:

- campaign play remains the main progression ladder
- endless mode becomes the best way to fund expensive post-campaign purchases after the campaign is beaten
- this ties the endgame loop directly into both the main shop and the endless-exclusive shop

Failure and persistence rules:

- endless runs should not cost energy, keys, or other consumables to enter
- a failed run should simply end and pay out what was earned from the waves already cleared
- the account should permanently remember at least the best wave reached
- the game should also remember lightweight lifetime stats such as total endless runs and total endless bosses cleared if a run-history layer is added later

Scoring and status:

- the primary score should be highest cleared wave
- secondary stats can include total run `Glitch Essence` earned, time survived, and bosses defeated
- endless mode should give the player a clean visible personal-best target even before any global leaderboard exists

Economy role:

- `Scrap` should remain the currency for the base shop and weapon upgrades
- endless mode should be the late-game `Glitch Essence` engine
- the endless-exclusive shop should become the top-end `Glitch Essence` sink for finished accounts
- this keeps the standard account economy and the endgame chase economy meaningfully separate

The intended late-game loop becomes:

> finish campaign `5` -> unlock endless mode and the endless shop -> push waves -> earn `Glitch Essence` -> buy exclusive chase items -> upgrade key copies through the normal economy -> push deeper endless waves

Guardrails:

- endless mode must not invalidate the campaign ladder before the ladder is beaten
- endless mode must not flood so many packs that the shop stops mattering
- endless mode must respect the same readability concerns as the campaign game, especially around wave duration and enemy clutter
- endless mode should reward deep runs sharply enough that strong builds feel valuable, but not so sharply that short runs feel pointless
- the endless-exclusive shop should stay small and intentional so it feels like a chase destination rather than a second bloated catalog

Implementation direction:

- first version should prioritize brutal scaling, reliable `Glitch Essence` payout, boss checkpoints, personal-best tracking, and the endless shop unlock
- do not block endless mode on prestige, world maps, or global leaderboard features
- prestige can later sit above endless mode once the current duplicate economy, shop economy, and upgrade loop are proven at scale

Current implementation progress:

- endless is now being folded into the normal campaign framework as a dedicated endless campaign entry rather than a standalone test container
- the current prototype already supports generated infinite waves, `5`-wave boss checkpoints, `25`-wave major bosses, and escalating health/damage/spawn/wave-size scaling inside that shared campaign shell
- endless checkpoint selection now uses `25`-wave brackets as real selectable restart entries: clearing wave `25` unlocks wave `26`, clearing wave `50` unlocks wave `51`, and so on
- when an endless run fails, restart should anchor to the start of the current unlocked `25`-wave checkpoint bracket instead of always resetting to wave `1`
- `Glitch Essence`, endless-shop purchases, unlock gating, personal-best tracking, and endless-run persistence are intentionally deferred until the combat structure is locked in

### Wave pacing update

The current wave pacing direction is now explicitly tightened.

Primary rule:

- no level should take longer than roughly `120` seconds at the outer bound

Implementation rule of thumb:

- target wave pressure by increasing spawn density before increasing enemy roster complexity
- preserve each campaign's enemy identity and roster composition style
- avoid solving pacing by introducing new enemy types into earlier campaigns

Practical tuning model:

- use `totalEnemies / spawnRatePerSecond` as the first pacing proxy
- normal levels should usually live well below the hard cap
- bosses may run longer than normal waves, but should still remain under the same outer-bound expectation in real play

Current implemented pacing decisions:

- Campaign `1`
  - early tutorial-adjacent levels now spawn significantly faster
  - the goal is to remove low-pressure waiting without changing the roster identity
- Campaign `2`
  - Stage `5` levels now receive a `+50%` spawn-rate spike
  - composition identity stays unchanged
- Campaign `3`
  - Stage `5` levels now receive a `+50%` spawn-rate spike
  - composition identity stays unchanged
- Campaign `4`
  - spawn rate is aggressively increased across the full campaign
  - Stage `5` still receives the additional `+50%` spawn-rate spike
  - this campaign keeps its current enemy roster and population model, but relies on extremely high spawn density to respect the pacing cap
- Campaign `5`
  - should not try to exceed Campaign `4` primarily through additional screen clutter
  - should hold density flatter and push difficulty mainly through higher per-enemy health and damage
  - should use boss mechanics, elite checks, and priority-target pressure to spend the difficulty budget that Campaign `4` spends on crowd volume

Design intent of the update:

- faster clears
- much higher on-screen pressure
- less dead time between threats
- unchanged per-campaign enemy identity
- stage `5` of every campaign should feel like a clear density escalation band

### Recommended implementation order

The current recommended order is:

1. implement dungeons as the next major feature
2. finish the Season `1` weapon milestone
3. add daily quests as a lightweight progression boost
4. sort the endgame weapon system and `Glitch Essence` economy
5. expand deeper systemic layers once those pillars are in place

Reason:

- dungeons are the largest remaining missing feature and should define the next big expansion phase
- the remaining weapon milestone should be finished against the real post-campaign content shape rather than in isolation
- daily quests are valuable, but they are a support layer rather than the main progression pillar
- the `Glitch Essence` endgame should be finalized after the surrounding progression structure is clearer

---

## Immediate next design task

The immediate design task after this document should be:

> fully define dungeons, daily quests, the remaining weapon-milestone gap, and the endgame `Glitch Essence` weapon layer as the current unimplemented systems roadmap.

That is the clearest next step because the campaign spine already extends through Campaigns `5` and `6`, while the biggest missing work now sits in these adjacent progression and endgame systems.

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

---

## Future design backlog: utilities and Campaign 3

This section remains a useful future design note, but it is not the current milestone order.

Utilities and Campaign 3 ideas should be treated as backlog material to revisit when they fit the active roadmap again.

### Utilities

Utilities should use the same grid as weapons, but they are not damage items.
They trade loadout space for defensive or tempo-oriented effects.

Initial utility set:

- Shield
  - normal rarity
  - 2x2 footprint
  - triggered utility
  - grants a 20-point shield pool for 1 cycle
  - visual: blue circle around the pixl while active
- Cycle Booster
  - legendary rarity
  - 1x1 footprint
  - passive utility
  - reduces the cycle interval of touching weapons by 1, minimum 1
  - only shared-edge contact counts as touching
- Damage Boost
  - rare rarity
  - 1x5 vertical footprint
  - triggered utility
  - grants +20% damage to all weapons for the rest of the current cycle
- Booster utilities
  - 1x1 footprint
  - passive utilities
  - only one copy of each booster can be equipped in a loadout even when the booster is not legendary
  - `Shield Booster`: normal rarity, adjacent shield utilities grant +25% shield
  - `Projectile Speed Booster`: magic rarity, adjacent weapons gain +100% projectile speed
  - `Lifesteal Booster`: rare rarity, adjacent weapons gain +10% lifesteal
  - `Shieldsteal Booster`: exotic rarity, adjacent weapons gain +10% shield steal
  - `Damage Booster`: legendary rarity, adjacent weapons deal +50% damage

Utilities should begin dropping in mid-Campaign 2 so the player learns them before Campaign 3 begins to lean on utility-aware builds.

### Campaign 3 direction

Campaign 3 should continue using the Campaign 2 enemy roster:

- biter
- swarmer
- tanker
- shard
- bulwark

It should then add one new support enemy first, rather than replacing the existing identities.

Campaign 3 should also introduce a new offensive build system:

### Elemental infusions

Campaign 3 weapons should begin introducing `elemental infusions` as a new activation dependency.

The four elemental types are:

- `fire`
- `lightning`
- `cold`
- `void`

Core rule:

- an elemental weapon does not fire just because the sweep reaches its trigger column
- it also requires a matching elemental infusion to be available
- when it fires, it consumes one matching infusion

This means Campaign 3 builds should start caring about two linked layers:

- where elemental weapons are placed
- whether the player is generating the right infusions to feed them

### Infusers

The first source of elemental infusions should be utility items called `Infusers`.

Initial infuser set:

- Fire Infuser
- Lightning Infuser
- Cold Infuser
- Void Infuser

Initial infuser rules:

- each infuser is a `2x2` utility item
- each infuser generates its own matching elemental infusion
- elemental weapons then consume those infusions when triggered
- all four infusers are `normal` rarity
- infusers should be able to drop throughout all of Campaign 3

### Initial elemental weapon rarity and drop rules

The first elemental weapons introduced alongside the infusion system should all be `exotic` rarity.

Initial rule:

- the first wave of elemental payoff weapons all drop throughout Campaign 3 rather than being restricted to only late stages

This means the early Campaign 3 loop should teach the new system directly:

- infusers can begin appearing across the campaign
- elemental weapons can also begin appearing across the campaign
- players are expected to discover the generator-and-consumer relationship while progressing, not only at the very end

Infusion lifecycle rules:

- an infuser generates `1` matching infusion per cycle
- infusions do not persist between cycles
- all stored infusions dissipate when the current sweep cycle ends
- within a single cycle, any number of infusions can be stored if the player generates them

Consumption priority:

- if multiple elemental weapons would consume the same elemental infusion during the same sweep window, priority should resolve from top to bottom
- the highest placed weapon on the loadout gets first claim on the matching infusion
- lower placed weapons only fire if enough matching infusions remain after higher placed weapons consume theirs
- elemental weapons can require more than one matching infusion for a single activation when balance calls for it

Current special case:

- Thor's Hammer consumes `2` lightning infusions per activation

Design intent:

- Campaign 3 should deepen the loadout puzzle beyond raw shape fitting
- elemental weapons should feel stronger or more specialized, but only when their support utilities are present
- infusers and elemental weapons should create mini-engines inside the larger sweep system

This should become a defining Campaign 3 mechanic rather than a one-off gimmick.

### New enemy: shielder

The new shielder glitch should:

- use the same movement pattern as shard
- stay on the outer ring as a ranged support unit
- have very high HP
- periodically shield the enemy closest to the pixl
- never target bulwark

Targeting rule:

- find the non-bulwark enemy closest to the pixl
- apply or refresh a shield pool on that target
- if only bulwarks remain, the shielder does not cast on that tick

Role separation is important here:

- bulwark is the self-protecting frontliner
- shielder is the backline support unit that protects someone else

This avoids the worst stall case where a highly durable bulwark is also the primary support target.

---

## Next expansion: Campaign 4 direction

Campaign 4 should pivot the game away from mostly solving raw target damage and toward solving enemy positioning.

The core Campaign 4 identity should be:

- manipulating where glitches are on the screen
- grouping enemies into better kill windows
- combining crowd control with loadout timing
- making the player think much harder about trigger columns, activation order, and combo setup

This means Campaign 4 should push the player to care not only about which weapons are strong on their own, but also about:

- where those weapons are placed in the sweep
- which weapons should activate earlier to group or stall enemies
- which weapons should activate later to cash in on that grouping
- how crowd-control tools and payoff tools can be paired inside the same cycle

### Campaign 4 weapon identity

Campaign 4 weapons should revolve around battlefield control and combo payoff rather than only direct stat scaling.

The design intent should be:

- some weapons move, pull, stall, cluster, or pin enemies
- some weapons deal better damage when targets are grouped tightly together
- some weapons should be tuned specifically to follow up after crowd-control setup
- loadout ordering should matter more than it did in earlier campaigns

This should make Campaign 4 feel like the first campaign where the player is actively building a control engine, not just a damage package.

### Campaign 4 difficulty direction

Campaign 4 should increase combat pressure dramatically, especially through spawn density.

Primary difficulty rule:

- overall spawn rate should be roughly `3x` to `4x` higher than in earlier campaigns

This increase should be strong enough that simple single-target builds begin to fail unless the player uses grouping, crowd control, or better sweep sequencing.

The intent is:

- the screen should feel more crowded
- target prioritization should become less stable by default
- players should need tools that shape the wave, not only tools that damage it

### New enemy: Zerglitch

Campaign 4 should introduce a new enemy archetype: `Zerglitch`.

Zerglitch rules:

- it begins as a large single enemy
- it stays in that large form until killed
- when it dies, it bursts into `10` small enemies

Design intent:

- the player should have to decide whether they can safely burst the large body immediately
- killing it at the wrong time can flood the arena with fresh pressure
- grouping and area control should help manage the spawned swarm
- crowd control becomes more valuable because the enemy creates a second wave on death

This enemy should reinforce the Campaign 4 identity directly:

- positioning matters
- kill timing matters
- sweep order matters
- crowd control and grouped damage matter

### Campaign 4 note status

This section defines the campaign identity and pressure goals only.

Weapon specifics, exact control mechanics, and final roster details should be documented in a later Campaign 4 weapon pass once the control-combo direction is locked in.

### Early Campaign 4 weapon note: Void Tunnel

One of the first concrete Campaign 4 weapon concepts should be `Void Tunnel`.

`Void Tunnel` should act as a control-first elemental weapon that helps define the campaign's manipulation identity.

Initial spec direction:

- name: `Void Tunnel`
- rarity: `rare`
- element: `void`
- requires `1` void infusion to activate
- primary role: grouping and compression setup for combo weapons

Proposed shape:

```text
xxxx
----
xxxx
```

This means:

- width `4`
- height `3`
- full occupied top row
- empty middle row
- full occupied bottom row

Targeting rule:

- `Void Tunnel` should target the closest enemy when it activates

Effect direction:

- the weapon should spawn one crushing void square above the target area and one below it
- instead of covering the full arena, the tunnel should affect a large local region around the chosen target
- the control radius should be large, roughly approaching half the arena, but not fully global
- enemies in that affected region should be pushed or compressed toward the middle of the tunnel

The reason for this constraint is important:

- full-arena compression is likely too reliable and too strong
- local compression around a chosen target still creates a powerful combo window
- this preserves the Campaign 4 identity without making the weapon universally dominant in every build

Debuff direction:

- enemies affected by `Void Tunnel` should receive `void touched`
- `void touched` should make enemies take `+30%` elemental damage
- duration: `3` seconds

Design intent:

- `Void Tunnel` should be a setup weapon first, not a pure damage weapon
- it should reward placing follow-up elemental or area-control weapons later in the sweep
- it should help make Campaign 4 feel like a combo-timing campaign rather than only a stat-check campaign

### Early Campaign 4 weapon note: Phaseshift

Another key Campaign 4 control weapon should be `Phaseshift`.

`Phaseshift` should serve a different battlefield-control role than `Void Tunnel`.
Where `Void Tunnel` compresses and groups enemies into a kill window, `Phaseshift` should function as a positional reset tool that throws enemies back out toward the arena edge.

Initial spec direction:

- name: `Phaseshift`
- rarity: `legendary`
- primary role: large-scale repositioning and wave reset control
- shape: `6x1`
- cycle cooldown: `5`
- active duration: `3` cycles

Effect direction:

- `Phaseshift` should target a fixed position to the right of the `pixl`
- it should spawn a large vertical teleporter line at that fixed right-side location
- the line should be perpendicular and long, covering roughly `50%` of the arena height
- the affected zone should also occupy a substantial horizontal slice of that right-side space, roughly `50%` of the arena width on that side
- any glitch that collides with that line while it is active should be teleported back out toward the edge of the arena
- the destination should be outside the normal arena boundary, roughly `50` pixels beyond the arena edge

Debuff direction:

- `Phaseshift` should apply `confusion` to affected glitches
- `confusion` should reduce glitch movement speed by `33%`
- duration: `2` seconds

Design intent:

- `Phaseshift` should not be a damage-first weapon
- it should buy space by forcibly resetting enemy position
- it should be especially strong against dense waves that are beginning to overrun the center
- it should create new timing windows by sending part of the wave back out, effectively re-staggering enemy arrival

This makes `Phaseshift` a strong Campaign 4 identity piece because it reinforces all of the campaign's spatial-control goals:

- where enemies are matters
- when enemies arrive matters
- crowd control can be used to change wave shape, not just slow it
- loadout sequencing can capitalize on re-approach timing after enemies are displaced

Balancing note:

- `Phaseshift` should feel powerful because it is `legendary`, but the `5` cycle cooldown is an important limiter
- its strength should come from reset utility and combo timing, not from replacing direct damage weapons

### Early Campaign 4 weapon note: Force Field

Another important Campaign 4 control weapon should be `Force Field`.

`Force Field` should act as a temporal trap weapon.
Unlike `Void Tunnel`, which compresses enemies, or `Phaseshift`, which resets them outward, `Force Field` should lock enemies in place and create a temporary hold zone for follow-up damage.

Initial spec direction:

- name: `Force Field`
- primary role: trap setup and local crowd lockdown
- cycle cooldown: `2`
- hold duration: `1` cycle

Trigger flow:

- `Force Field` should fire a small projectile at the closest enemy
- on impact, that projectile should expand outward
- the expansion should then create a circular force field zone

Effect direction:

- glitches caught in that circular zone should be stunned
- stunned glitches should remain fixed in place while the field is active
- the field should function like a temporary anchor that prevents those enemies from advancing

Design intent:

- `Force Field` should create a reliable setup window for grouped follow-up hits
- it should reward placing payoff weapons later in the sweep so they can hit locked targets
- it should be one of the clearest examples of Campaign 4's crowd-control-and-combo identity

This makes `Force Field` distinct from the other control tools:

- `Void Tunnel` groups enemies inward
- `Phaseshift` sends enemies back out
- `Force Field` freezes enemies in place for a short combo window

### Early Campaign 4 weapon note: Napalm Grenade

Campaign 4 should also add at least one persistent-area damage weapon so the player can capitalize on displacement and clustering with longer-lived kill zones.

`Napalm Grenade` is the clearest candidate for that role.

Initial spec direction:

- name: `Napalm Grenade`
- rarity: `exotic`
- primary role: persistent AOE payoff for grouped or displaced enemies
- requires `1` fire infusion to activate
- cycle cooldown: `3`
- burned-ground duration: `2` cycles

Effect direction:

- `Napalm Grenade` should launch toward the target area and create a patch of burning ground on impact
- the burned ground should persist for `2` full cycles
- enemies standing in or moving through the patch should take repeated fire damage over that duration
- the weapon should reward pulling enemies inward with `Void Tunnel`, pinning them with `Force Field`, or re-staggering them through `Phaseshift`

Design intent:

- Campaign 4 should not rely only on instant control plus direct burst
- persistent AOE gives the player a reason to care about where enemies remain after they are moved
- `Napalm Grenade` should feel like a payoff tool for a control engine rather than a generic fire weapon

Identity role inside Campaign 4:

- `Void Tunnel` groups enemies into the burn zone
- `Force Field` keeps enemies standing inside the burn zone
- `Phaseshift` can reset part of a wave while the burn zone finishes another cluster

This makes `Napalm Grenade` an important missing piece in the Campaign 4 control-combo toolkit because it introduces persistent territorial damage rather than only one-moment impact.

### Early Campaign 4 weapon note: The Bomb

The final Campaign 4 weapon should be a delayed burst payoff piece called `The Bomb`.

Unlike the earlier Campaign 4 tools, which focus on displacement, locking, or persistent area denial, `The Bomb` should represent the high-commitment finisher that cashes in after the control setup is already working.

Initial spec direction:

- name: `The Bomb`
- rarity: `legendary`
- primary role: delayed massive-damage payoff
- cycle cooldown: `4`
- detonation delay: `1` cycle

Effect direction:

- `The Bomb` should place a bomb at the target location when it fires
- that bomb should remain in place for `1` cycle before detonating
- when it detonates, it should deal massive damage in a meaningful local area
- the damage should be balanced around the expectation that the player first groups or holds enemies inside the blast zone

Design intent:

- `The Bomb` should reward players for planning one step ahead instead of only reacting in the current cycle
- it should feel strongest when paired with `Void Tunnel` or `Force Field`, which help keep enemies inside the future detonation area
- it should also work as a high-risk follow-up after `Napalm Grenade`, stacking persistent burn pressure with a burst finish

Identity role inside Campaign 4:

- `Void Tunnel` compresses enemies into the future blast zone
- `Force Field` can pin enemies long enough for the delayed detonation to connect
- `Napalm Grenade` softens clustered enemies before the burst lands
- `The Bomb` serves as the campaign's biggest payoff weapon when the full control engine is assembled

This gives Campaign 4 a clearer end-state loadout fantasy: manipulate enemy position, hold them in a kill pocket, layer persistent pressure, and then cash out with a delayed explosive finisher.
