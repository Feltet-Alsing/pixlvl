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

### Cross-campaign weapon expansion direction

The current campaign-local weapon pools are not large enough on their own to guarantee satisfying variety, especially once pack rewards begin rolling multiple cards at once.

The next weapon-expansion pass should therefore introduce a shared cross-campaign pool of build-defining weapons and utilities.

These should not erase campaign identity.
They should fill tactical gaps, deepen synergy options, and prevent later pools from collapsing into the same few repeated high-rarity outcomes.

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

The first shared-pool pass should intentionally support a small set of repeatable archetypes:

- mark and focus-fire
- execute and cleanup
- swarm control and chip conversion
- range access and backline pressure
- sweep-order and trigger-column synergy
- status setup and payoff
- control-heavy single-target conversion

The goal is to let players recognize a build shell across campaigns while still using campaign-specific headliners and visuals.

#### Refined concept shortlist

The following concepts are worth preserving as the first serious shared-pool design set.

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
- `Fan of Knives`: radial stack builder
- `Blood Catalyst`: bleed multiplier utility
- `Siphoning Knife`: legendary finisher modifier

The intended play pattern is:

1. `The Knife` establishes early single-target wound pressure
2. `Fan of Knives` multiplies wound application once the build has enough support
3. `Blood Catalyst` scales all stored bleed into serious kill pressure
4. `Hemorrhage Burst` converts overstacked bleed into local AOE clears
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
- its purpose is to seed heavy stored bleed early and let later pieces convert that pressure into payoff

##### Hemorrhage Burst

- rarity: `magic`
- type: `utility`
- role: bleed threshold rupture conversion

Effect direction:

- if an enemy's stored bleed exceeds its current maximum health, that enemy bursts
- the burst creates a blood explosion around the target
- the explosion deals AOE damage equal to all stored bleed consumed at the moment of rupture

Rule direction:

- the rupture consumes all stored bleed on the target when it explodes
- the explosion should be a meaningfully large local radius, roughly `15%` to `20%` of the visible screen
- the explosion itself should not recursively trigger further hemorrhage bursts unless a later legendary explicitly adds that behavior

Design purpose:

- gives the bleed package its first real density answer
- rewards overstacking wounds on elites or frontliners and then cashing them out into nearby packs

##### Fan of Knives

- rarity: `rare`
- type: `weapon`
- cadence: `2` cycles
- role: radial bleed stack builder

Activation rule:

- gains its full payoff behavior when combined with `The Knife`

Attack direction:

- throws `12` knives in a circle around the `pixl`
- the visual should fan outward clearly rather than reading as an instant ring pop
- the animation should sell a radial knife burst with outward motion and slight spread timing if needed

Design purpose:

- converts the bleed package from one-target setup into real multi-target wound coverage
- still relies on other pieces for actual AOE cashout, keeping the archetype staged rather than self-contained too early

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
- type: `weapon` or `utility-keystone`
- role: completed knife-package finisher

Activation rule:

- gains its defining effect when combined with both `Fan of Knives` and `The Knife`

Effect direction:

- `Fan of Knives` projectiles gain life leech equal to `50%` of damage dealt
- `Fan of Knives` direct raw damage gains an additional `x2` multiplier

Design purpose:

- turns the radial knife shell from pure setup into a self-sustaining late-game payoff engine
- creates a satisfying final package where the same radial burst both stacks bleed and helps the `pixl` survive sustained pressure

##### Bleed-package dependency rule

This package introduces a new type of named loadout dependency.

Current direction:

- `combined with` should mean the named item must connect through the named anchor in the active loadout when the package calls one out explicitly
- for the knife package, `The Knife` is the anchor: `Fan of Knives` and `Siphoning Knife` each need to touch `The Knife`, but do not need to touch each other
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
- hemorrhage explosion size should be tuned around `15%` to `20%` of visible screen space
- `Blood Catalyst` doubles bleed damage per copy but clamps at `x6` total final multiplier
- `Siphoning Knife` grants `50%` life leech to `Fan of Knives` damage only
- combo conditions require adjacency in the loadout, not just simultaneous equip

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
3. if the level awards a pack, determine which campaign pack and pack rarity dropped
4. open the pack through a card-reveal sequence
5. generate the contents of that pack from the current campaign's eligible item pool

Current first-pass pack-drop rules:

- Campaign `1` levels have a base `10%` chance to drop one Campaign `1` pack on clear
- Campaign `2+` levels have a base `5%` chance to drop one pack from their own campaign on clear
- the final level of each campaign acts as that campaign's current boss-stage reward spike
- the final level of Campaign `1` increases pack-drop chance to `20%`
- the final level of Campaign `2+` increases pack-drop chance to `10%`
- there are currently no guaranteed pack drops
- new accounts should start with `1` unopened Campaign `1` pack

This means the system should move from:

> every eligible weapon rolls its own chance

to:

> the level rolls one bounded pack outcome

#### Pack identity and campaign ownership

Each campaign should award its own themed packs.

Design intent:

- a pack that drops from Campaign `1` should open into Campaign `1` content
- a pack that drops from Campaign `4` should open into Campaign `4` content
- each campaign currently has `2` pack types: `normal` and `legendary`
- stages `1-3` roll `normal` packs and stages `4-5` roll `legendary` packs
- the reward should feel like opening a themed set of cards rather than receiving one loose weapon instance
- the presentation should lean into the existing collectible-card feel of the item art and UI

This gives tighter control over reward identity and progression pacing:

- campaigns retain a stronger loot identity
- later campaigns can feel more exciting through better packs rather than only more frequent rewards
- opening rewards becomes a more satisfying event than silently appending another item to inventory

#### Pack rarity and contents

Each pack should currently contain `5` cards.

Pack structure:

- `normal` packs roll all `5` cards from the campaign pool using the standard rarity weights
- `legendary` packs roll `4` standard cards plus `1` guaranteed high-rarity slot

Core rule for the guaranteed slot:

- only `legendary` packs guarantee `1` `exotic` or `legendary` card
- the guaranteed slot currently splits `50 / 50` between `exotic` and `legendary`

This guaranteed high-rarity slot is important because `legendary` pack openings should feel like a distinct reward spike.

Both pack types can still include lower-rarity items or duplicates, and `normal` packs can still randomly roll any campaign weapon.

Design intent:

- the pack itself is the top-level reward outcome
- the contents are then generated from the campaign's eligible item pool
- the guaranteed `exotic` / `legendary` slot should define the emotional floor of the reward

#### Pack opening surface

Pack rewards should not open as a tiny inline popup.

The game should add a dedicated `Packs` route or tab where unopened packs can be viewed and opened intentionally.

Design intent:

- unopened packs should accumulate as inventory objects until the player chooses to open them
- the player should be able to see which campaign a pack belongs to
- pack opening should feel like a discrete reward ritual rather than background admin
- the route should support opening one pack at a time with clear reveal pacing

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
- `campaignId`
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
- duplicate cards inside a pack are currently allowed
- duplicate protection is not part of the first implementation
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

These points still need explicit definition before implementation:

- whether stage gating inside a campaign should remove some weapons from early pack openings
- how unopened packs are represented in persistence and inventory UI
- whether the `Packs` tab should support opening multiple packs in sequence after closing the current summary

#### Implementation plan

The preferred implementation order is:

##### Phase 1: data model and persistence

Goal:

- add a persistent sealed-pack model without disturbing the existing owned-weapon flow first

Preferred implementation shape:

- use a dedicated persisted pack record rather than embedding unopened packs inside `pixl_state.owned_weapons`
- keep pack records server-authored and separate from inventory items

Primary code surfaces:

- `src/lib/data/types.ts`
- `src/lib/server/db/game.schema.ts`
- `src/lib/server/game-state.ts`

Implementation tasks:

- add types for persisted packs and persisted pack cards
- add database storage for unopened and opened pack records
- add starter-account logic that seeds `1` unopened Campaign `1` pack for new users
- add game-state helpers for listing packs and opening a pack atomically

Preferred outcome:

- packs exist as first-class persisted reward objects before the UI tries to render them

##### Phase 2: pack reward generation

Goal:

- replace the current direct item-drop reward generation with pack reward generation at level clear

Primary code surfaces:

- `src/lib/p5/campaign-1-sketch.ts`
- `src/lib/data/index.ts`
- campaign weapon definition files under `src/lib/data/weapons/`

Implementation tasks:

- remove direct level-end owned-weapon reward creation from the combat clear flow
- add pack-drop chance evaluation by campaign and boss-stage level rules
- generate sealed pack contents at drop time using the agreed `5` card structure
- resolve the guaranteed slot as `50 / 50` `exotic` or `legendary`
- resolve the `4` normal slots using the current rarity weights
- store the dropped pack instead of immediately adding revealed cards to inventory

Preferred outcome:

- combat clear now awards sealed packs instead of raw weapon instances

##### Phase 3: Packs route and pack list UI

Goal:

- create the management surface where players can inspect and open unopened packs

Primary code surfaces:

- `src/routes/campaigns/[campaignId]/+layout.svelte`
- `src/lib/components/campaigns/CampaignRouteNav.svelte`
- new route under `src/routes/campaigns/[campaignId]/packs/`

Implementation tasks:

- add a `Packs` route/tab to the campaign route navigation
- list unopened packs first
- show campaign identity and basic pack metadata without revealing contents
- show whether any unopened pack contains newly dropped rewards waiting to be opened

Preferred outcome:

- pack inventory becomes a normal route surface alongside Arena, Loadout, Shop, and Stats

##### Phase 4: open flow and reveal sequence

Goal:

- open one sealed pack through a short card-by-card reveal sequence and summary screen

Primary code surfaces:

- new `packs` route component(s)
- `src/lib/server/game-state.ts` or dedicated pack server helpers

Implementation tasks:

- implement the atomic open action
- grant the stored card rewards to inventory at open time
- mark the pack as opened in the same transaction
- reveal cards one by one on click
- save the guaranteed high-rarity slot for the strongest beat
- show a final summary screen with `new` markers

Preferred outcome:

- opening a pack is presentation over a fixed server result, not another roll

##### Phase 5: notifications, migration, and cleanup

Goal:

- integrate packs cleanly with the rest of the campaign flow and remove old drop assumptions

Primary code surfaces:

- `src/lib/game/notifications.ts`
- `src/lib/server/campaign-route.ts`
- `src/routes/campaigns/[campaignId]/+page.svelte`
- `src/routes/campaigns/[campaignId]/loadout/+page.svelte`

Implementation tasks:

- replace direct new-weapon notification assumptions with unopened-pack or opened-pack aware logic
- decide whether the Recent feed logs sealed pack drops, revealed cards, or both
- update any route-level badges to reflect unopened packs if needed
- remove dead code paths from the old direct drop model
- rebalance authored weapon chances to work inside the pack generator rather than as direct end-of-level rewards

Preferred outcome:

- the game no longer behaves like a direct item-drop system in UI or persistence

##### Phase 6: balance pass after implementation

Goal:

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

### Milestone 1: finish Campaign 4

This is the current active milestone and immediate content priority.

Goal:

- make Campaign 4 feel complete as the control-combo campaign

Required outcomes:

- finish the remaining incomplete or weak-feeling Campaign 4 weapons
- ensure Campaign 4 weapons solve recognizably different combat problems
- add enough persistent AOE and positional-payoff tools to complete the control loop
- rebalance the full Campaign 4 pool as one unit instead of isolated weapon tweaks

Exit criteria:

- the Campaign 4 roster has no obvious placeholder-feeling weapons
- the campaign supports a full manipulation-and-payoff loadout fantasy
- weak or overlapping Campaign 4 weapons have been reviewed and resolved

### Milestone 2: build Campaign 5

Campaign 5 is the next mainline expansion after Campaign 4 is complete.

Goal:

- add a new campaign whose difficulty comes from a new boss mechanic layer, not only bigger numbers

Required outcomes:

- formalize the Campaign 5 boss mechanic direction
- define Campaign 5 level structure and reward pool
- add any missing Campaign 5 weapons required by that content
- deliver a boss readability pass so the new mechanic is understandable in play

Exit criteria:

- Campaign 5 has a distinct pressure identity
- boss encounters create new build checks instead of pure stat walls

### Milestone 3: dungeon side progression

Dungeon Keys and dungeon-exclusive stages come after the next mainline campaign is stable.

Goal:

- add a higher-risk side progression path with exclusive rewards

Required outcomes:

- dungeon key acquisition source
- dungeon access flow and UI
- dungeon-specific scaling rules
- dungeon-exclusive loot pool
- dungeon-specific enemies or variants where needed

Exit criteria:

- dungeon content is clearly legible as separate progression
- dungeon rewards feel meaningfully different from campaign rewards

### Milestone 4: weapon revision pass

This happens after Campaign 4, Campaign 5, and dungeons expose the real roster gaps.

Goal:

- run a purpose-and-identity pass across the full weapon roster

Required outcomes:

- identify stale or overlapping weapons
- add weapons where the current game lacks meaningful decisions
- rebalance unclear, weak, dominant, or filler-feeling items
- answer which weapons are mandatory, optional, or redundant

Exit criteria:

- each weapon has a clearer gameplay purpose
- obvious filler and overlap have been reduced

### Milestone 5: broader systems depth

These are important expansion pillars, but they should layer onto the content roadmap above rather than replace it.

System priorities inside this milestone:

- enemy depth
- weapon identity and synergy
- long-term goals and progression loops
- balance pass
- combat readability and polish

Key directions:

- ranged enemies
- support enemies
- split-on-death enemies
- elite variants
- boss mechanics beyond simple stat spikes
- on-hit effects
- piercing
- chain attacks
- splash
- adjacency or column-based synergies
- stronger duplicate economy and shop loops
- pacing and reward readability improvements

Near-term note:

- prestige is still a valid long-term system, but it should come after the game has a stronger duplicate economy and shop loop

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

### Recommended implementation order

The current recommended order is:

1. finish Campaign 4 weapon content
2. formalize and build Campaign 5 boss mechanics and progression
3. implement Dungeon Keys, dungeon stages, and dungeon-exclusive rewards
4. run the broader weapon revision and stale-gameplay pass after the new content is in place
5. expand deeper systemic layers once the larger content roadmap has exposed the real gaps

Reason:

- the weapon revision pass will be much stronger after the roster and progression structure are closer to their intended full shape
- dungeon rewards and Campaign 5 mechanics may expose weapon gaps that are not visible yet
- system-depth work is easier to prioritize once the content spine is stable

---

## Immediate next design task

The immediate design task after this document should be:

> fully define the remaining Campaign 4 completion work with the same level of clarity before expanding the codebase into Campaign 5 or dungeon systems.

That is the clearest next step because Campaign 4 is the current active milestone and the rest of the roadmap depends on it being meaningfully complete.

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
