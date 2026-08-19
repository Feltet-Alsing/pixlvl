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

### Duplicate handling direction

Duplicates are currently a natural part of the drop loop, and that is good.
They support:

- multiple copies of strong filler weapons
- alternative loadout shapes using the same weapon family
- build flexibility while the inventory is still small

However, duplicate accumulation should not remain purely passive forever.
Once the player has a stable collection, excess copies become inventory noise unless they convert into a second reward loop.

The next inventory-economy layer should be:

- duplicate weapons that are not currently equipped can be scrapped
- scrapping produces a persistent resource called `Scrap`
- `Scrap` is spent in a `Shop`

Initial scrap values by rarity:

- `normal`: `5` Scrap
- `magic`: `25` Scrap
- `rare`: `100` Scrap
- `exotic`: `500` Scrap
- `legendary`: `5000` Scrap

Scrap rules:

- only duplicates can be scrapped
- equipped items cannot be scrapped
- an item must be unequipped before it becomes scrapable
- scrapping should support bulk actions from grouped inventory entries rather than forcing one-item-at-a-time cleanup
- choosing Scrap on a grouped item should open a popup where the player enters or adjusts the number of copies to scrap
- the popup should give granular control over quantity instead of only offering fixed presets
- scrapping `exotic` or `legendary` items should require an explicit warning confirmation before the action completes

The scrap popup should show:

- current duplicate count
- current equipped count
- scrap value per item
- total scrap yield for the selected quantity
- warning text when the item rarity is `exotic` or `legendary`

The shop should not replace drops.
It should sit beside them as a pressure-release valve and long-term goal layer.

Design intent:

- drops remain the primary source of new weapons
- duplicates remain useful in the early and mid game
- excess duplicates become meaningful instead of dead inventory
- the player gains some agency over bad luck without deleting randomness

Initial shop direction:

- stock should focus on unique, curated items rather than common filler
- shop items should feel special enough that saving Scrap is a real choice
- shop inventory can include weapons, utilities, or other build-defining unlocks
- shop items should be exclusive to the shop rather than shared with the normal drop pool
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

Shop exclusivity is important:

- campaign drops should remain the source of normal campaign loot
- the shop should offer its own distinct rewards
- players should not be able to buy a shop item from the drop pool later, or vice versa
- this keeps Scrap spending exciting without diluting the identity of campaign drops

Duplicate purchase behavior:

- shop-exclusive items are not one-time unlocks only
- if a player wants multiple copies of the same shop item for loadout reasons, they should be allowed to buy duplicates over time
- purchased shop items can therefore reappear in later refreshes if the roll selects them again

Shop item mix:

- the long-term direction should be a mix of shop-exclusive weapons and shop-exclusive utilities
- in the near term, shop inventory will lean on exclusive weapons first because utilities are not implemented yet
- utility-based shop inventory should be added as part of the next utility implementation pass rather than faked early

Progression gating:

- the shop should be tied to campaign progression rather than being fully open from the start
- the player should not be able to bypass a whole campaign simply by farming duplicates into Scrap
- clearing a stage `5` boss level should unlock the next appropriate shop inventory band
- each unlocked campaign should add its own shop-exclusive item pool

This means the shop should behave like a progression-aware supplement:

- clear stage `5` of a campaign or stage band
- unlock the corresponding campaign shop pool
- spend Scrap only within the pools already earned through play

The goal is to let Scrap smooth progression and provide player agency without turning the shop into a campaign skip system.

Shop refresh model:

- the shop should include a controlled amount of randomness
- shop inventory should refresh every `15` minutes
- each refresh should roll `5` random items from the currently unlocked campaign shop pools
- each refresh must contain `5` distinct items rather than duplicate entries of the same item
- campaign `1` shop should effectively show its guaranteed pool because only campaign `1` shop items are unlocked at that point
- later campaigns should keep earlier campaign shop items in the pool, but with reduced weight
- campaign `2` should roll campaign `1` shop items at roughly `50%` weight compared with campaign `2` shop items
- the same principle should continue forward so older campaign shop items remain possible but become less common than current-tier items
- randomness should never pull from locked future campaign shop pools

Rarity and pool behavior:

- rarity still matters for how exciting a shop roll feels, but the primary rule is campaign-pool eligibility first
- current campaign shop items should dominate the roll table
- older unlocked campaign shop items should remain in rotation as lower-weight fallback options

This means the intended flow is:

- progression unlocks additional campaign shop pools
- the timer refreshes what is currently on offer from those unlocked pools
- current campaign items feel most relevant, while older campaign items still occasionally reappear

This means duplicate handling should evolve into:

> drop -> keep or equip -> duplicate overflow -> scrap -> save toward unique shop items

This is a stronger near-term retention feature than prestige and should happen earlier.

### Weapon upgrades direction

The next progression layer after duplicate scrapping should be per-instance weapon upgrading.

Design intent:

- duplicates should continue to matter after the player stabilizes a collection
- Scrap should become a meaningful long-term sink rather than only a shop currency
- upgraded items should feel like invested gear rather than fungible duplicates
- upgrading should add more player interaction without turning the inventory into noise

Core rules:

- upgrades apply per weapon instance, not per weapon definition
- only weapons can be upgraded
- utilities cannot be upgraded
- any zero-damage weapon should be reclassified as a utility instead of being forced into the weapon upgrade system
- reclassified zero-damage items should still enact exactly as they do now in combat; only their category changes
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

### Weapon upgrades implementation readiness

The upgrade design is now specific enough to prepare implementation work.

#### Systems directly affected

The current codebase already shows where the upgrade system will land.

Primary data and runtime surfaces:

- `src/lib/data/types.ts`
- `src/lib/server/game-state.ts`
- `src/lib/server/db/game.schema.ts`
- `src/lib/server/campaign-route.ts`
- `src/lib/server/shop.ts`
- `src/lib/p5/campaign-1-sketch.ts`

Primary UI and grouping surfaces:

- `src/routes/campaigns/[campaignId]/loadout/+page.svelte`
- `src/lib/components/campaigns/LoadoutInventoryToolbox.svelte`
- `src/lib/components/campaigns/LoadoutGridBoard.svelte`
- `src/lib/components/campaigns/LevelResultsPopup.svelte`
- route helpers that build reward and inventory grouping rows

#### Important current implementation fact

`OwnedWeaponInstance` already has a `level` field in the current type model.

That means the upgrade system does not need a brand-new identity model for owned items.
However, the meaning of that field must become explicit and persistent across the full economy and UI flow.

The owned-weapon instance model should evolve to support at least:

- current upgrade level
- total Scrap invested in that specific copy
- existing identity fields such as `instanceId`, `definitionId`, acquisition data, and ownership source

`totalScrapInvested` should be stored explicitly rather than recomputed from level alone.

Reason:

- refund is based on invested Scrap
- future rebalance changes to upgrade cost should not corrupt old refund values
- explicit invested value is more robust than reverse-calculating from current rules later

#### Current duplicate and scrap constraint

The current scrap flow is definition-group based.

Right now, duplicate scrapping works by passing a `definitionId` and a quantity through the campaign-route/server scrap path.
This is good enough for unupgraded duplicate cleanup, but not good enough for upgraded-copy protection by itself.

The upgrade system therefore requires two rule layers:

- UI layer: upgraded weapons never appear in bulk scrap candidate groups
- backend layer: bulk scrap logic must reject upgraded weapons even if a future UI bug or malformed request includes them

Bulk scrap should only ever operate on unupgraded duplicate copies.

#### Inventory grouping consequence

Current inventory is grouped primarily by weapon definition.

After upgrades:

- unupgraded copies of the same weapon definition can still be grouped together
- upgraded copies should always be broken out as distinct instance entries
- upgraded copies should display `Original Name +N`
- upgraded copies should not be counted toward duplicate-bulk-scrap groups

This is the key inventory rule that keeps the system readable.

#### Combat/runtime consequence

Upgrade scaling should be applied at the owned-instance level when combat state is built, not by mutating global weapon definitions.

Reason:

- multiple copies of the same definition may exist at different upgrade levels
- combat must respect per-instance scaling
- loadout summaries and reward/inventory displays need to remain instance-accurate

Runtime upgrade application should therefore happen when equipped weapon state is derived from owned instances and placements.

#### Multi-projectile capstone warning

The `+1 projectile` rule is design-valid, but not every qualifying weapon uses the same firing path.

Some weapons already use custom runtime activation logic and will need bespoke handling for the final capstone.

Current known examples:

- `Blaster`
- `Splitter`
- `Pulse Array`

The generic spread path should still support the capstone for ordinary projectile-count weapons, but custom-activation weapons will need explicit support.

#### Zero-damage reclassification candidates

The current clear candidates for reclassification from weapon to utility are the zero-damage campaign 4 items:

- `Void Tunnel`
- `Black Hole`
- `Phaseshift`
- `Force Field Trap`

These should keep their current combat behavior and activation identity, but move out of the upgradeable weapon category.

That means category should control:

- upgrade eligibility
- inventory grouping
- scrap/bulk scrap behavior
- how the item is presented in UI filters and tabs

But category should not automatically change combat behavior.

#### Recommended implementation phases

Phase 1: data model and persistence

- formalize owned-weapon upgrade fields
- persist `totalScrapInvested`
- migrate existing saves safely with all current items at base level and zero invested Scrap

Phase 2: inventory and scrap rules

- separate upgraded copies from unupgraded groups
- exclude upgraded copies from bulk scrap in both UI and backend
- support single-copy scrap with 50% invested Scrap refund

Phase 3: combat scaling

- apply damage and projectile-speed scaling per equipped instance
- apply capstone rules at `+5`
- handle custom multi-projectile weapons explicitly

Phase 4: zero-damage reclassification

- move zero-damage candidates into utility classification
- preserve their current runtime behavior
- confirm shop, drops, notifications, and loadout views still treat them correctly

Phase 5: upgrade UI

- show `+N` naming
- show next upgrade cost
- show refund value
- expose upgrade actions clearly without mixing them into duplicate bulk-scrap flows

#### Final implementation guardrails

- upgraded copies must never be bulk-scrapped
- refund must use stored invested Scrap, not inferred cost
- per-instance combat scaling must not mutate shared definitions
- zero-damage items must remain behaviorally identical after reclassification

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
- duplicate overflow does not yet convert into a meaningful secondary economy
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

- duplicate scrapping into a persistent Scrap currency
- a Scrap shop with curated unique items
- campaign-specific unlocks
- weapon collection goals
- achievement-like milestones
- prestige or rebirth later
- build presets and saved loadouts

Near-term note:

- prestige is still a valid long-term system, but it should come after the game has a stronger duplicate economy and shop loop

### Priority 4: balance pass

Run a more deliberate tuning pass across:

- early-wave pacing
- time-to-first-level
- time-to-first-drop excitement
- health scaling versus enemy contact pressure
- sweep speed feel at low and mid progression
- stage-to-stage difficulty spikes

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

Design intent of the update:

- faster clears
- much higher on-screen pressure
- less dead time between threats
- unchanged per-campaign enemy identity
- stage `5` of every campaign should feel like a clear density escalation band

### Priority 5: combat readability and polish

Improve the feel layer without changing the underlying loop.

Examples:

- stronger hit feedback
- better projectile readability
- clearer stage/boss transitions
- better death/reset messaging
- more satisfying reward presentation

### Priority 6: content expansion roadmap

The next major content phase is now defined as a structured expansion pass rather than a single feature drop.

This expansion pass has four connected tracks.

#### Track 1: finish Campaign 4 weapons

Campaign 4 still needs a final content pass on its weapon roster.

This is now the immediate content priority before Campaign 5 or the dungeon-key system.

Goals:

- finish the remaining incomplete or weak-feeling Campaign 4 weapons
- ensure Campaign 4 weapons solve recognizably different combat problems
- make the final campaign roster feel like a meaningful escalation over earlier campaigns
- re-evaluate disabled or placeholder-feeling Campaign 4 items before calling the campaign complete
- add more persistent AOE tools that reinforce Campaign 4's positional-combo identity

Implementation intent:

- complete the last missing weapon concepts first
- then rebalance the full Campaign 4 pool as one unit
- do not treat Campaign 4 weapon work as isolated number tweaks only; the full set should be reviewed for overlap and dead slots

Immediate Campaign 4 sub-goals:

- finish the last missing control and combo weapons
- ensure Campaign 4 has enough persistent-area weapons to reward enemy displacement and clustering
- identify any Campaign 4 items that are conceptually right but numerically too weak to justify using over generic damage tools

#### Track 2: add Campaign 5

Campaign 5 should be the next mainline campaign expansion.

Core requirement:

- Campaign 5 must introduce a new boss mechanic layer rather than only adding harder numbers

Current design note:

- the exact Campaign 5 boss mechanic is still driven by separate design notes and needs to be formalized before implementation

Campaign 5 goals:

- add a new campaign with its own enemy pressure identity
- preserve the current core loop while making boss encounters feel more mechanically distinct
- use boss mechanics to create new build checks rather than only larger stat walls

Expected work areas:

- Campaign 5 level structure
- Campaign 5 reward pool
- Campaign 5 weapon additions if needed
- new boss encounter scripting and readability pass

#### Track 3: dungeon keys and exclusive dungeon stages

Add a new side-content progression layer based on `Dungeon Keys`.

Dungeon Keys direction:

- Dungeon Keys drop from a specific source pool
- each key unlocks access to a specific dungeon stage or dungeon route
- dungeon content should use much harder enemy scaling than standard campaign levels
- dungeon stages should reward a dungeon-exclusive loot pool rather than normal campaign drops

Dungeon system goals:

- create a higher-risk side progression path
- add a source of rare or build-defining dungeon loot
- give late-game players a reason to chase content outside the normal campaign ladder

Important content requirements:

- dungeon UI
- dungeon stage structure and access flow
- dungeon-specific enemy scaling rules
- dungeon-exclusive reward pool
- dungeon-specific enemies or enemy variants where needed

Implementation note:

- the dungeon system is not just a level flag; it needs its own progression/readability layer so players understand entry, difficulty, and reward expectations immediately

#### Track 4: weapon revision and stale-gameplay pass

Run a broader weapon review across the game after Campaign 4 and Campaign 5 content solidify.

This pass should focus on:

- identifying where combat gameplay feels stale
- adding weapons where the current roster does not create enough meaningful decisions
- revising weapon roles where two or more items currently overlap too much
- rebalancing weapons whose purpose is unclear, too weak, too dominant, or not exciting to slot

This is not only a balance pass.

It is a purpose-and-identity pass for the weapon roster.

Questions this pass should answer:

- what player problem does each weapon solve?
- which weapons are pure filler and should become more distinct?
- where are the obvious build gaps?
- which campaign rewards feel mandatory instead of optional?

#### Recommended implementation order

The current recommended order is:

1. finish Campaign 4 weapon content
2. formalize and build Campaign 5 boss mechanics and progression
3. implement Dungeon Keys, dungeon stages, and dungeon-exclusive rewards
4. run the broader weapon revision and stale-gameplay pass after the new content is in place

Reason:

- the weapon revision pass will be much stronger after the roster and progression structure are closer to their intended full shape
- dungeon rewards and Campaign 5 mechanics may expose weapon gaps that are not visible yet

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

---

## Next expansion: utilities and Campaign 3

The next major gameplay layer should add utility items and a third campaign that builds on the Campaign 2 roster rather than replacing it.

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
