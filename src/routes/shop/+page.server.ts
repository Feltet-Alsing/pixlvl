import { redirect } from '@sveltejs/kit';

import { getLastPlayedCampaignId, getOrCreateGameState } from '$lib/server/game-state';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/campaigns/1/shop');
	}

	const gameState = await getOrCreateGameState(locals.user.id);
	throw redirect(302, `/campaigns/${getLastPlayedCampaignId(gameState)}/shop`);
};
