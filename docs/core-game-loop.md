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

## Pixl core attributes

The first combat version should keep the `pixl` stat model intentionally small.

The `pixl` currently has three core combat attributes:

- `health`
- `damage`
- `attack speed`

### Health

`Health` is the `pixl`'s survival pool.

When health reaches `0`, the `pixl` dies and the current wave resets.

This is the primary defensive stat in the first combat model.

### Damage

`Damage` is how much the `pixl` deals per successful attack.

This is the core per-shot power stat.

### Attack speed

`Attack speed` is how often the `pixl` attacks.

This should be thought of as attacks per second rather than a hidden cooldown, because it is easier to reason about and balance.

### Offensive relationship

`Damage` and `attack speed` combine into effective offensive output:

$$
DPS = damage \times attack\ speed
$$

This creates a clean division:

- `health` controls how long the `pixl` survives under pressure
- `damage` controls how hard each attack hits
- `attack speed` controls how quickly attacks are delivered

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

For the initial combat model:

- attacks use projectile travel
- projectile speed is not yet configurable
- all projectiles use a fixed standard projectile speed

This means `projectile speed` exists as part of the combat model conceptually, but remains a constant until later progression systems make it modifiable.

The design should not worry about advanced projectile edge cases yet, such as unusual retargeting or more complex miss rules.

The immediate purpose is simply:

- the `pixl` chooses the closest `Glitch`
- the `pixl` fires a projectile toward it
- the projectile travels at a standard speed
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

Within this structure:

- normal levels follow a readable baseline growth pattern
- stages can act as pacing bands within a campaign
- the final level in a stage or campaign can act as a `boss level`
- boss levels intentionally break the normal scaling curve

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

Instead, the player should actively shape the `pixl` by investing resources into its core stats.

## Gold-driven pixl leveling

The current progression model is:

- enemies drop `gold`
- the player uses that `gold` to level up the `pixl`
- each level-up investment is directed into a chosen stat

This makes power growth an active decision rather than a passive background increase.

The exact drop rates can be tuned later, but the reward-scaling direction should already be defined.

For now, the important system rule is that enemy drops are the resource that fuels `pixl` growth.

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

- `health`
- `damage`
- `attack speed`

For the first pass, these upgrades use simple percentage-based growth:

- `health`: `+15%` per upgrade
- `damage`: `+15%` per upgrade
- `attack speed`: `+5%` per upgrade

These numbers are not final balance targets. They are the initial design baseline and can be tuned later.

This mirrors the `pixl`'s core combat attributes and keeps the progression model tightly coupled to the combat model.

## Why this matters

This approach supports the intended fantasy of build experimentation:

- a player can create a tankier `pixl` by prioritizing `health`
- a player can create a harder-hitting `pixl` by prioritizing `damage`
- a player can create a faster-firing `pixl` by prioritizing `attack speed`

Even with only three stats, this already creates meaningful directional builds.

The weaker `attack speed` increase is intentional.

Because `attack speed` compounds offensive output very efficiently, its per-upgrade gain should start lower than `health` and `damage`.

## Provisional upgrade cost baseline

For the first economy pass, upgrade prices should be easy to understand and spaced so the player can make regular choices without upgrading every few seconds.

Recommended starting costs:

- `health`: starts at `20 gold`
- `damage`: starts at `20 gold`
- `attack speed`: starts at `35 gold`

This gives a useful early rhythm:

- early `Stage 1` levels can usually fund a `health` or `damage` upgrade after a small number of clears
- `attack speed` feels more premium and requires more deliberate saving

## Cost growth principle

Upgrade costs should rise smoothly over time rather than staying flat.

The current design direction is:

- `health` and `damage` should share the same cost curve
- `attack speed` should either start more expensive or scale more harshly

For the first implementation, a practical rule is:

- after each purchase, increase the next cost by about `20%`

That would produce an early cost flow like:

- `health`: `20`, `24`, `29`, `35`, `42`, `50`
- `damage`: `20`, `24`, `29`, `35`, `42`, `50`
- `attack speed`: `35`, `42`, `50`, `60`, `72`, `86`

These are not final balance targets, but they are a coherent opening range that matches the current reward model and preserves the idea that `attack speed` is the more premium offensive investment.

## First progression principle

For the first version of the game, `pixl` power should primarily come from player-directed investment rather than large automatic stat growth from simply advancing levels.

That means the main progression loop is:

1. clear waves
2. earn `gold` from defeated `Glitches`
3. invest `gold` into `health`, `damage`, or `attack speed`
4. test the updated build against harder levels

This creates a clean feedback loop between combat success, resource gain, and build refinement.

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

- `projectile speed`: `360`
- `pixl collision radius`: `20`
- `enemy collision radius`: `14`
- `enemy contact range`: `26`

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
