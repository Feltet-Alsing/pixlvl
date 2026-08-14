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
