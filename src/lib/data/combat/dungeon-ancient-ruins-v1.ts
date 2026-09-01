import type { CombatProfile } from '$lib/data/types';

import { baselineCombatProfile } from './baseline-v1';

const boostedGlitches = Object.fromEntries(
	Object.entries(baselineCombatProfile.glitches).map(([kind, stats]) => [
		kind,
		{
			...stats,
			moveSpeed: stats.moveSpeed * 3
		}
	])
) as CombatProfile['glitches'];

export const dungeonAncientRuinsCombatProfile: CombatProfile = {
	...baselineCombatProfile,
	id: 'dungeon-ancient-ruins-v1',
	glitches: boostedGlitches
};
