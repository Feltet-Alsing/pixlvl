# pixlvl Core Game Loop

## Current alignment

`pixlvl` is an idle-first combat game centered on a single persistent unit: the `pixl`.

The player does not manually aim or move during moment-to-moment combat. The game plays itself, while the player manages the `pixl` through long-term build decisions such as items, skills, equipment, and later progression systems.

## Combat model

The `pixl` is positioned in the center of the arena.

Enemies spawn around the outer edge of the arena in waves and advance inward over time.

For the current design slice, enemies are melee-only:

- They move toward the `pixl`
- They damage the `pixl` by reaching it and attacking in contact range
- They do not yet use ranged behavior or advanced mechanics

At the same time, the `pixl` attacks automatically.

This creates a passive combat loop where success depends on whether the `pixl` can kill incoming enemies fast enough to survive the wave.

## Wave loop

A wave currently works like this:

1. A wave begins with multiple enemies spawning around the `pixl`
2. Enemies steadily encroach toward the center
3. The `pixl` auto-attacks without direct player input
4. If all enemies die, the wave is cleared
5. If the `pixl` dies, that wave respawns and is attempted again

## Failure model

Failure is local to the wave.

If the `pixl` dies, the current wave resets instead of causing a full permanent loss of all progress.

This means the core pressure is about overcoming a combat checkpoint, not surviving a roguelike-style hard run reset.

## Player role

The player's role is strategic rather than mechanical.

The player is primarily optimizing:

- Damage output
- Survivability
- Build synergy
- Wave-clear consistency
- Long-term growth efficiency

The player is not primarily being tested on reflexes or manual targeting.

## Core fantasy

The current fantasy is:

> Build and evolve a `pixl` that can automatically survive increasingly dangerous enemy waves while you refine its gear, skills, and progression.

## Assumptions currently in scope

These are the assumptions this design note is based on:

- The `pixl` stays fixed in the center
- Enemies can approach from all directions
- The `pixl` attacks automatically
- Combat is mostly self-running
- Wave resets are local failures
- Melee enemies are the first enemy type to define clearly

## Immediate next design questions

Before coding the combat system further, the next design step should define:

1. How the `pixl` selects targets and attacks
2. How melee enemies move and how contact damage is applied
3. How wave size, enemy stats, and spawn pacing scale
4. What the player can change between failed wave attempts
5. Which rewards are earned on wave clear versus over longer progression arcs

## UI notes

The combat surface should be treated as a full-screen arena first, with interface chrome added as overlays instead of shrinking or boxing the play area.

Reusable UI rules for this surface:

- The `pixl` remains visually centered in the viewport-driven arena
- Combat HUD text such as banked gold, wave gold, and remaining enemies should anchor relative to the arena ring, not the screen edge
- Shop and stats are overlay panels that can be hidden without changing the combat layout
- Utility controls such as `hide/show stats` and `hide/show shop` should stay compact and visually quiet
- Purchase buttons inside overlay panels should be smaller and more discreet than primary navigation actions
- Larger screens may reveal more empty space, but they must not increase enemy spawn distance or reduce pressure

## Pixl core attributes

The first combat version should keep the `pixl` stat model intentionally small.

The `pixl` currently has three core combat attributes:

- `defence`
- `strength`
- `agility`

These are the three core permanent perks the player levels outside of combat.

Each perk maps directly to a first-pass combat output:

- `defence` scales `health`
- `strength` scales `damage`
- `agility` scales loadout `sweep speed`

### Health

`Health` is the `pixl`'s survival pool.

When health reaches `0`, the `pixl` dies and the current wave resets.

This is the primary defensive stat in the first combat model.

### Damage

`Damage` is how much the `pixl` deals per successful attack.

This is the core per-shot power stat.

### Agility

`Agility` does not directly mean a shorter universal weapon cooldown.

Instead, it controls how quickly the loadout sweep travels from the left side of the loadout grid to the right side.

The faster the sweep moves, the more often placed weapons are activated over time.

### Offensive relationship

`Strength` and `agility` combine into effective offensive output, but not through a simple global fire-rate formula.

Actual damage output depends on:

- weapon damage values
- where weapons are placed in the loadout
- how many weapons are triggered during each sweep
- how quickly `agility` moves the sweep across the grid

This creates a clean first division:

- `health` controls how long the `pixl` survives under pressure
- `damage` controls how hard each activation hits
- `agility` controls how quickly the activation sequence progresses

This should remain the full first-pass `pixl` combat stat model.

The design should avoid adding extra combat stats too early, such as:

- armor
- crit chance
- evasion
- regeneration
- lifesteal
- projectile count
- range modifiers

Those may become useful later, but they would blur whether the base loop is working.

## First enemy stat model

To match the simple `pixl` stat model, enemies should also begin with a minimal rule set.

The overall enemy category is called `Glitches`.

`Glitches` are the hostile wave units that pressure the `pixl` from the outer arena toward the center.

The first melee enemy design should only require:

- `health`
- `contact damage`
- `attack speed`
- `move speed`
- `count per wave`

### Enemy health

How many attacks, or how much total damage, the enemy can absorb before dying.

### Contact damage

How much damage the enemy deals to the `pixl` once it reaches melee range.

### Attack speed

How often the enemy deals its contact damage once it is engaged with the `pixl`.

For enemies, `attack speed` defines the interval of their melee attack cycle after they have reached the center.

### Move speed

How quickly the enemy closes the distance from the outer spawn ring toward the center.

### Count per wave

How many enemies are present in a wave.

This is one of the cleanest early difficulty levers because it changes pressure without needing more complex enemy mechanics.

## Core melee enemy behavior

The first melee `Glitch` behavior loop should be simple and consistent across all enemy types.

1. The enemy spawns on the outer area of the arena
2. The enemy moves toward the `pixl` at its designated `move speed`
3. If the enemy is not in contact with the `pixl`, it keeps advancing
4. Once the enemy collides with the `pixl`, it stops advancing
5. While in contact, it begins its melee attack cycle
6. It deals its `contact damage` at intervals defined by its `attack speed`
7. It remains engaged until it dies or the wave resets

This means melee enemies have two states in the first model:

- `approaching`
- `engaged`

The important rule is that collision changes the enemy from movement pressure into sustained damage pressure.

That keeps the loop readable:

- before contact, the threat is time-to-impact
- after contact, the threat is damage-over-time from attack cycles

## Pixl targeting behavior

The `pixl` should eventually support configurable targeting priorities, but that is not part of the first combat version.

For the initial implementation, the targeting rule should be fixed and simple:

- the `pixl` always attacks the `Glitch` closest to it

This means the `pixl` naturally prioritizes the most immediate threat rather than making more advanced decisions.

This is a good first-pass rule because it is:

- easy to understand
- easy to visualize
- easy to balance
- aligned with the defensive goal of protecting the center

Later targeting rules can be introduced as configurable behavior, such as:

- closest enemy
- lowest health
- highest health
- fastest enemy
- first enemy to reach a danger radius

For now, `closest target` is the baseline targeting model.

## Pixl attack delivery

The `pixl` should not use instant-hit attacks in the first combat version.

Instead, the `pixl` attacks by firing projectiles that travel through space toward the selected target.

This is important because it preserves room for a later `projectile speed` stat and keeps combat visually legible.

For the current combat direction:

- the loadout has a sweep line that travels from left to right
- whenever that sweep crosses a weapon, that weapon activates once
- activated weapons then perform their own attack behavior, which can include firing projectiles
- projectile speed should be defined per weapon
- different weapons can use different projectile travel speeds

This means the timing model is no longer "one global fire interval."

Instead, combat timing comes from sweep traversal across the loadout grid.

### Framerate independence rule

Combat difficulty must not depend on browser render performance.

That means all gameplay-relevant timing and movement should be simulated using elapsed time, not raw frame count.

In practice, this means these values should be treated as time-based rates:

- projectile speed in pixels per second
- enemy move speed in pixels per second
- enemy attack cadence in attacks per second or seconds per attack
- sweep traversal speed in a time-based unit such as columns per second

The design should avoid frame-based rules such as "move `1` pixel every render" for combat systems, because that would make slower machines play an easier or harder version of the game.

Lower framerate may still reduce visual smoothness, but it should not intentionally change combat balance.

### Sweep rules

The first sweep model should follow these rules:

- the sweep always starts at the far left of the loadout
- it moves continuously toward the far right
- `agility` determines how quickly it traverses the grid
- when it reaches a weapon's leftmost occupied column, that weapon activates once
- if multiple weapons share that same column, they all activate at the same time
- when the sweep reaches the far right edge, it instantly resets to the far left and begins again

For the first version, weapons do not have individual cooldowns.

That means a placed weapon can activate once per sweep cycle.

Later balancing may allow a sweep to reset early when no more weapons remain to the right, which would help lightweight builds, but that is a later tuning rule rather than the initial baseline.

The design should not worry about advanced projectile edge cases yet, such as unusual retargeting or more complex miss rules.

The immediate purpose is simply:

- the `pixl` chooses the closest `Glitch`
- the active weapon fires its attack toward it
- the projectile travels at that weapon's projectile speed
- if it connects, it applies the `pixl`'s damage

## First glitch archetypes

The first melee enemy roster should begin with three core `Glitch` archetypes.

These are not special enemies yet. They are the baseline building blocks for wave composition.

### Biter

`Biter` is the standard melee enemy.

Design role:

- normal move speed
- medium health
- low damage
- normal attack speed

`Biter` is the baseline reference enemy that helps define what "normal wave pressure" feels like.

### Swarmer

`Swarmer` is the fast pressure enemy.

Design role:

- fast move speed
- low health
- low damage
- fast attack speed

`Swarmer` is meant to test whether the `pixl` can keep up with fast incoming targets and avoid being overwhelmed by leak-through pressure.

### Tanker

`Tanker` is the heavy pressure enemy.

Design role:

- slow move speed
- high health
- high damage
- slow attack speed

`Tanker` is meant to create attrition pressure and punish builds that can clear small enemies quickly but struggle against durable threats.

## Archetype purpose

These three `Glitch` types already create a useful first combat triangle:

- `Biter` defines the baseline
- `Swarmer` stresses target response and wave leakage
- `Tanker` stresses sustained damage and survival under heavy contact threat

This is enough variety for early wave composition before adding ranged enemies, support enemies, splitters, or elite modifiers.

## First wave logic questions

With enemy behavior and attack delivery defined at a basic level, the next design layer is wave logic.

The next theory-crafting pass should answer:

1. How many enemies spawn at the start of a wave?
2. Do all enemies spawn at once or in timed batches?
3. When do `Biters`, `Swarmers`, and `Tankers` begin appearing?
4. How is a wave considered cleared?
5. What exactly resets when the `pixl` dies and the wave restarts?

## First wave scaling structure

Wave progression should be organized into a fixed three-tier hierarchy rather than treated as one endless flat list.

The current structure is:

- `Campaign`
- `Stage`
- `Level`

The intended grouping is:

- `1 Campaign`
- `5 Stages` per `Campaign`
- `10 Levels` per `Stage`

That means each `Campaign` contains `50 Levels` total.

This gives the game three useful scales of progression:

- `Level` for short-term encounter progression
- `Stage` for mid-sized checkpoints and pacing shifts
- `Campaign` for larger progression arcs and thematic advancement

Terminology should stay consistent in implementation:

- `Campaign`: the overall content category
- `Stage`: one of `5` difficulty bands inside a campaign
- `Level`: one of `10` encounters inside a stage

Within this structure:

- normal levels follow a readable baseline growth pattern
- stages can act as pacing bands within a campaign
- the final level in a stage or campaign can act as a `boss level`
- boss levels intentionally break the normal scaling curve

## Stage access model

Players should be able to move back and forth across available stages freely.

The game should not force a one-way climb where earlier stages become inaccessible.

This matters because the intended rhythm includes regularly revisiting lower difficulties for testing, farming, or trying different builds.

That means stage selection should work more like a difficulty ladder the player can browse at will than a locked forward march.

The player should be able to:

- choose a currently available stage before starting combat
- step back down to easier stages when desired
- return to harder stages later without penalty

## Baseline linear growth

The first scaling model should be simple and predictable.

Each normal level begins from a baseline enemy count, for example `5`, and grows linearly from there.

That means each successive non-boss level adds a fixed amount of pressure rather than using a complex curve immediately.

The main purpose of this model is clarity:

- players can feel steady progress
- players can anticipate that later levels are harder in a readable way
- balancing is easier because the baseline curve is understandable

## Boss level spike

The last level in a meaningful progression group should not feel like just one more linear step.

Instead, it should deliberately break the baseline difficulty curve by applying a noticeable bump.

This can happen at different scales:

- a stage-ending boss level
- a campaign-ending boss level

That bump can come from:

- a higher enemy count than the linear curve predicts
- a harsher enemy composition
- a stat bonus to the wave
- or a combination of those factors

The key design rule is that the boss level should feel like a checkpoint rather than a normal incremental increase.

## First scaling principle

For the earliest version of `pixlvl`, the cleanest scaling approach is:

1. enemy count scales linearly through normal levels
2. enemy composition becomes more threatening over time
3. stage transitions can adjust pacing
4. boss levels intentionally spike above the normal linear expectation

This keeps the system readable while still allowing dramatic progression moments.

## Why this works

This structure is a good fit for the game because it supports both comfort and tension:

- normal levels communicate steady growth
- boss levels test whether the current build is actually sufficient
- local wave resets make repeated boss attempts meaningful instead of frustrating

This also gives strong room for later tuning, because the design can separately control:

- baseline count growth
- enemy composition growth
- stage-to-stage escalation
- boss-level spike strength

## Pixl scaling philosophy

The most important part of `pixlvl` progression is experimentation and granular control over the `pixl`.

That means `pixl` scaling should not be mostly automatic.

## Revised scaling direction

The current direction is that the main way a `pixl` scales is not through repeated direct stat leveling.

Instead, the primary source of build power should be `weapons` and `items` that drop from enemies.

Direct stat upgrades can still exist, but they should act as a supporting progression layer rather than the main identity of a build.

This is a better fit for the intended fantasy because it gives the player something more expressive than simply pushing `health`, `damage`, or `attack speed` upward.

The player should primarily be asking:

- what dropped
- what fits into the current build
- how to arrange a stronger loadout
- which pieces are worth replacing

That makes progression more about buildcraft and spatial optimization than about buying raw numbers.

## Pixl loadout grid

Each `pixl` has a `5 x 8` grid that acts as its loadout space.

This loadout grid is the main build surface for the player.

Players should be able to drag `weapons` and `items` from their inventory into this grid.

Not every weapon or item uses the same amount of space.

Different pieces can have different footprint sizes, meaning they occupy different shapes or amounts of cells inside the `5 x 8` grid.

Because the grid is limited, part of the skill of building a strong `pixl` is using the available space efficiently.

That means a good build is not only about owning strong pieces, but also about arranging them so the loadout uses as much of the `5 x 8` space as possible.

## Out-of-combat build editing

Perks and loadout editing should be restricted to non-combat states.

The player should not be changing core perk allocation or rearranging the loadout while an active combat attempt is running.

Instead, build editing happens when combat is not active, such as:

- before starting a run
- after a run ends
- after the player manually stops a run
- in other non-combat management states

This means the combat portion stays committed and readable, while the management portion remains strategic and deliberate.

## Why this matters

This loadout system creates several useful pressures at once:

- loot drops matter because they can open new build paths
- footprint size matters because larger pieces compete for limited space
- inventory decisions matter because not every good item can necessarily fit
- arrangement matters because efficient packing becomes part of player mastery

This gives `pixlvl` a much stronger identity than a pure stat-purchase loop.

It also creates room for later nuance such as:

- differently shaped items
- adjacency or synergy rules
- utility items versus weapons
- rare oversized pieces that force tradeoffs
- inventory sorting and build presets

Those details are not locked yet, but the core rule is now clear:

> the `pixl`'s main progression comes from equipping dropped weapons and items into a limited `5 x 8` loadout grid.

## Perk-driven pixl leveling

The current supporting progression model is:

- enemies drop `gold`
- the player uses out-of-combat progression to invest into permanent perks
- each level-up investment is directed into a chosen perk

This still makes power growth an active decision rather than a passive background increase, but it should now be understood as secondary to the weapon-and-loadout system.

The resource flow for perk leveling is now locked:

- perks are upgraded out of combat
- perk upgrades are permanent
- perk upgrades support the equipment-driven build rather than replacing it
- `gold` is the resource spent on those perk upgrades

The exact drop rates can be tuned later, but the reward-scaling direction should already be defined.

For now, the important system rule is that enemy drops fuel `pixl` growth in two layers:

- equipment drops drive the main build
- progression resources support smaller direct perk upgrades around that build

## Gold reward scaling

`Glitches` drop `gold` when defeated.

For the first economy model, `gold` rewards should scale linearly with the current `Stage`.

That means harder content is also directly more rewarding.

The design goal is simple:

- later stages are more dangerous
- later stages also generate more `gold`
- stronger content should feel worth pushing into

For now, the reward model should stay simple:

- gold is dropped by defeated `Glitches`
- the amount scales upward with stage progression
- the scaling is linear for the first pass

This keeps the economy readable while still creating a clear incentive to push harder content.

## Provisional gold drop baseline

For the first pass, the game should use a simple drop table that scales linearly with `Stage` and keeps stronger enemies slightly more rewarding.

Recommended starting values:

- `Biter gold = stage + 1`
- `Swarmer gold = stage + 2`
- `Tanker gold = stage + 5`

That gives these first-pass values:

| Stage | Biter | Swarmer | Tanker |
| ----- | ----- | ------- | ------ |
| 1     | 2     | 3       | 6      |
| 2     | 3     | 4       | 7      |
| 3     | 4     | 5       | 8      |
| 4     | 5     | 6       | 9      |
| 5     | 6     | 7       | 10     |

This is intentionally simple:

- stage progression increases all rewards linearly
- `Swarmers` are worth slightly more than `Biters`
- `Tankers` are worth meaningfully more because they are rarer and more threatening

With the current `Stage 1` baseline of `5` starting enemies and `+1 enemy per level`, this produces early rewards that should feel active without flooding the player with too much gold too quickly.

## First pixl upgrade paths

In the first progression version, the player can invest in only three upgrade paths:

- `defence`
- `strength`
- `agility`

These map to combat effects like this:

- `defence` increases `health`
- `strength` increases `damage`
- `agility` increases loadout `sweep speed`

For the first pass, these upgrades use simple percentage-based growth:

- `defence`: `+15%` health per upgrade
- `strength`: `+15%` damage per upgrade
- `agility`: `+5%` sweep speed per upgrade

These numbers are not final balance targets. They are the initial design baseline and can be tuned later.

This mirrors the `pixl`'s core combat attributes and keeps the progression model tightly coupled to the combat model.

## Why this matters

This approach supports the intended fantasy of build experimentation:

- a player can create a tankier `pixl` by prioritizing `defence`
- a player can create a harder-hitting `pixl` by prioritizing `strength`
- a player can create a faster-cycling loadout by prioritizing `agility`

Even with only three stats, this already creates meaningful directional builds.

The weaker `agility` increase is intentional.

Because faster sweep speed compounds offensive output very efficiently, its per-upgrade gain should start lower than `defence` and `strength`.

## Provisional upgrade cost baseline

For the first economy pass, upgrade prices should be easy to understand and spaced so the player can make regular choices without upgrading every few seconds.

Recommended starting costs:

- `defence`: starts at `20 gold`
- `strength`: starts at `20 gold`
- `agility`: starts at `35 gold`

This gives a useful early rhythm:

- early `Stage 1` levels can usually fund a `defence` or `strength` upgrade after a small number of clears
- `agility` feels more premium and requires more deliberate saving

## Cost growth principle

Upgrade costs should rise smoothly over time rather than staying flat.

The current design direction is:

- `defence` and `strength` should share the same cost curve
- `agility` should either start more expensive or scale more harshly

For the first implementation, a practical rule is:

- after each purchase, increase the next cost by about `20%`

That would produce an early cost flow like:

- `defence`: `20`, `24`, `29`, `35`, `42`, `50`
- `strength`: `20`, `24`, `29`, `35`, `42`, `50`
- `agility`: `35`, `42`, `50`, `60`, `72`, `86`

These are not final balance targets, but they are a coherent opening range that matches the current reward model and preserves the idea that `agility` is the more premium offensive investment.

## First progression principle

For the first version of the game, `pixl` power should primarily come from player-directed build decisions rather than large automatic stat growth from simply advancing levels.

That means the main progression loop is:

1. clear waves
2. get `weapon` and `item` drops from defeated `Glitches`
3. arrange those drops inside the `5 x 8` loadout grid
4. use `gold` for supporting upgrades when useful
5. test the updated build against harder levels

This creates a clean feedback loop between combat success, resource gain, and build refinement.

## First weapon system direction

Weapons are the primary active pieces inside the `pixl` loadout.

For the first pass, each weapon should define at least:

- a unique id
- a name
- a rarity
- a shape
- a base damage value
- an attack behavior
- a projectile speed value
- a visual projectile style
- a drop source or drop band

Because the sweep already determines activation timing, the first weapon pass should stay simple.

That means the earliest weapons do not need per-weapon cooldowns, charge states, or conditional trigger rules.

Each placed weapon simply activates when the sweep reaches its leftmost occupied column.

## Weapon rarity ladder

The game uses five weapon rarities:

- `Normal`: white
- `Magic`: blue
- `Rare`: yellow
- `Exotic`: red
- `Legendary`: brown-gold

For the first campaign, the drop pool should heavily favor lower rarities.

That keeps the early game readable and prevents the first campaign from being balanced around rare outliers.

## Shape definition direction

Weapons can occupy any fixed shape inside the `5 x 8` loadout grid.

For the first implementation, weapon orientation should also be fixed.

That means weapons do not rotate inside the loadout in the first version.

This may change later, but rotation is intentionally excluded for the initial implementation to keep placement rules simpler.

For the first implementation, weapon shape data should be stored explicitly rather than inferred from width and height alone.

The cleanest first-pass representation is:

- a bounding box width
- a bounding box height
- a list of occupied cells inside that box

Example shape definition:

```json
{
	"width": 3,
	"height": 2,
	"cells": [
		[0, 0],
		[1, 0],
		[2, 0],
		[0, 1],
		[1, 1],
		[2, 1]
	]
}
```

This is better than only storing a rectangular size because it supports both simple rectangles and later irregular shapes without changing the data model.

It also makes persistence straightforward because a weapon instance can simply reference a weapon definition id, while the equipped loadout stores position data.

## Persistence direction

The weapon system should eventually separate three layers of data:

- `weapon definitions`: static data such as name, rarity, shape, damage, visuals, and behavior
- `owned weapon instances`: which weapons a player has actually acquired
- `equipped loadout placements`: which owned weapons are currently placed, and at which grid coordinates

For now, the important rule is that weapon definitions should be saved as static content data, while ownership and loadout state should be saved in player progression data.

## Inventory direction

For the first implementation, player inventory should be treated as effectively infinite.

That keeps the first weapon rollout simple and avoids prematurely designing inventory pressure before the weapon system itself is proven.

If large inventories later create performance or UI-management issues, inventory limits can be introduced as a follow-up system.

## Duplicate weapon handling

Duplicate drops should eventually be salvageable.

The intended long-term rule is that a player can delete an unwanted duplicate weapon in exchange for a common weapon resource.

That salvage system should be noted now, but it does not need to block the first implementation.

For the initial build, duplicates can simply be stored as owned items while salvage remains a later follow-up.

## First Campaign 1 weapon pool

For the first pass, the opening weapon pool should stay intentionally small.

This draft assumes `5` opening weapons total, counting the guaranteed starter weapon.

If the intended count was `5` droppable weapons plus the starter, the pool should be expanded later.

### 1. Pea Shooter

- `type`: starter weapon
- `rarity`: `Normal`
- `drop source`: always owned at the start
- `shape`: `3 x 2` full rectangle
- `base damage`: `1`
- `projectile speed`: `360`
- `attack behavior`: fires one small green projectile at the current target
- `role`: baseline filler weapon that teaches the sweep system

### 2. Blaster

- `type`: drop weapon
- `rarity`: `Magic`
- `drop band`: `Campaign 1`, `Stages 1-3`
- `drop chance`: `2%` per defeated enemy in its valid stage band
- `shape`: `3 x 2` full rectangle
- `base damage`: `5`
- `projectile speed`: `300`
- `attack behavior`: fires two large red projectiles at the current target when activated
- `role`: early high-impact burst upgrade over the starter weapon

### 3. Needle

- `type`: drop weapon
- `rarity`: `Normal`
- `drop band`: `Campaign 1`, `Stages 1-5`
- `drop chance`: `4%` per defeated enemy
- `shape`: `1 x 2` full rectangle
- `base damage`: `2`
- `projectile speed`: `520`
- `attack behavior`: fires one thin fast white projectile at the current target
- `role`: compact efficient filler for tight loadouts

### 4. Splitter

- `type`: drop weapon
- `rarity`: `Rare`
- `drop band`: `Campaign 1`, `Stages 2-5`
- `drop chance`: `1%` per defeated enemy
- `shape`: `2 x 3` full rectangle
- `base damage`: `3` per projectile
- `projectile speed`: `340`
- `attack behavior`: fires three small yellow projectiles in a narrow spread toward the current target
- `role`: first weapon that improves wave clear through multi-projectile coverage

### 5. Heavy Orb

- `type`: drop weapon
- `rarity`: `Exotic`
- `drop band`: `Campaign 1`, `Stages 4-5`
- `drop chance`: `0.35%` per defeated enemy
- `shape`: `4 x 3` full rectangle
- `base damage`: `12`
- `projectile speed`: `220`
- `attack behavior`: fires one large slow red orb at the current target
- `role`: oversized premium weapon that trades loadout space for strong single-hit output

## Why this opening pool works

This first set creates simple, readable tradeoffs without overcomplicating the system:

- `Pea Shooter` teaches the baseline
- `Needle` rewards compact packing
- `Blaster` offers an obvious early power spike
- `Splitter` introduces multi-projectile behavior
- `Heavy Orb` introduces oversized high-commitment weapons

That is enough variety to start testing three important questions:

- how much space efficiency should matter
- how much stronger larger weapons should be
- whether early campaign drop rates feel rewarding without flooding the inventory

## First campaign composition rules

The first campaign should use a very explicit composition model so it can later be represented directly as data.

### Early tutorial band

For the first `3` levels of `Campaign 1`, waves should contain only `Biters`.

This gives the player time to understand the base loop before faster or heavier enemies are introduced.

Rule:

- `Campaign 1`, `Levels 1-3`: `Biters` only

### Composition rule after level 3

After the first `3` levels, enemy composition should be derived from total enemy count using simple occurrence rules.

For any eligible level after that point:

- `Swarmers = floor(totalEnemies / 3)`
- `Tankers = floor(totalEnemies / 8)`
- `Biters = totalEnemies - Swarmers - Tankers`

This means:

- a `Swarmer` is introduced for every third enemy occurrence, rounded down
- a `Tanker` is introduced for every eighth enemy occurrence, rounded down
- all remaining enemy slots are filled by `Biters`

### Interpretation of the rule

This composition model does a few useful things:

- `Biters` remain the backbone of the wave
- `Swarmers` become the first pressure escalator because they appear relatively often
- `Tankers` stay rarer and feel more significant when they start appearing

It also keeps the composition fully data-driven, because once a level's total enemy count is known, the full wave mix can be derived directly.

### First-pass use with linear scaling

If the current baseline is kept as:

- `Campaign 1, Stage 1, Level 1 = 5 enemies`
- `+1 enemy per level`

then this composition rule can be applied immediately once the level is above the first three-level tutorial band.

This gives a clean progression from:

- pure baseline enemies
- into mixed waves with regular `Swarmers`
- into mixed waves where `Tankers` begin to appear more occasionally

## First campaign data artifact

The first full campaign has been written into a JSON-ready runtime data artifact at `src/lib/data/campaigns/campaign-1.json`.

That file contains:

- the campaign/stage/level hierarchy
- baseline scaling rules
- per-level enemy counts
- derived `Biter`/`Swarmer`/`Tanker` composition
- per-enemy gold values by stage
- total gold reward per level
- stage boss and campaign boss markers

## Provisional combat stat sheet

For a first playable proof of concept, the combat model still needs a placeholder combat sheet.

That combat sheet should live outside the campaign itself, because the `pixl` is a separate progression object and the campaign should only describe content pressure.

The current first-pass combat profile is stored at `src/lib/data/combat/baseline-v1.json`.

These values are not final balance targets. Their job is to make the first campaign playable enough to test pacing, wave pressure, and upgrade feel.

Recommended first-pass values:

### Pixl base stats

- `health`: `100`
- `damage`: `10`
- `attack speed`: `1.0` attacks per second

This means the unupgraded `pixl` deals:

$$
base\ DPS = 10 \times 1.0 = 10
$$

### Shared combat constants

- `pixl collision radius`: `20`
- `enemy collision radius`: `14`
- `enemy contact range`: `26`

Projectile speed should no longer be treated as one shared constant for all weapons.

Instead, each weapon definition should carry its own projectile speed value.

These are implementation-facing constants meant to keep the first arena readable rather than physically perfect.

### Glitch base stats

`Biter` should be the baseline reference enemy:

- `health`: `20`
- `contact damage`: `6`
- `attack speed`: `0.8` attacks per second
- `move speed`: `55`

`Swarmer` should be the fast leak-through threat:

- `health`: `12`
- `contact damage`: `4`
- `attack speed`: `1.2` attacks per second
- `move speed`: `85`

`Tanker` should be the durable attrition threat:

- `health`: `45`
- `contact damage`: `12`
- `attack speed`: `0.5` attacks per second
- `move speed`: `35`

## Why these numbers are coherent enough for a POC

These values create a workable first pass for `Stage 1`:

- a `Biter` dies in `2` hits from a base `pixl`
- a `Swarmer` dies in `2` hits from a base `pixl`
- a `Tanker` dies in `5` hits from a base `pixl`

That means:

- basic enemies do not feel trivial, but they are still readable
- `Swarmers` pressure timing more than durability
- `Tankers` immediately test sustained damage output

At `100` base health, the `pixl` can survive several early mistakes without making contact damage feel meaningless.

This is the right standard for a POC: not perfect balance, but enough structure to expose whether wave flow and upgrade pacing feel correct.

In other words:

- the campaign defines wave content and rewards
- the combat profile defines `pixl` and enemy baseline numbers
- the runtime combines those two sources during simulation

## First combat balancing questions

With this minimal stat model, the first balancing pass should answer:

1. How many hits should the `pixl` survive in an early wave?
2. How many attacks should it take to kill a basic melee enemy?
3. How quickly should an on-curve `pixl` clear a standard wave?
4. Should failure usually feel like missing survivability or missing damage output?

This is the minimum complete combat foundation before introducing secondary stats or more advanced enemy behaviors.
