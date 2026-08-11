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
