import { error } from '@sveltejs/kit';

import { getCampaign, getCombatProfile, getDungeon } from '$lib/data';
import { getDungeonProgressForUser, getOrCreateGameState } from '$lib/server/game-state';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const dungeonId = Number(params.dungeonId);

	if (!Number.isInteger(dungeonId)) {
		throw error(404, 'Dungeon not found');
	}

	try {
		const dungeon = getDungeon(dungeonId);
		const sourceCampaign = getCampaign(dungeon.sourceCampaignId);
		const combatProfile = getCombatProfile(dungeon.combatProfile);
		const gameState = locals.user ? await getOrCreateGameState(locals.user.id) : null;
		const dungeonState = locals.user
			? await getDungeonProgressForUser(locals.user.id, dungeonId)
			: null;

		return {
			dungeonId,
			dungeon,
			sourceCampaign,
			combatProfile,
			gameState,
			dungeonState
		};
	} catch {
		throw error(404, 'Dungeon not found');
	}
};
