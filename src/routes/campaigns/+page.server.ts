import { getOrCreateGameState } from '$lib/server/game-state';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return {
			progressByCampaign: {}
		};
	}

	const gameState = await getOrCreateGameState(locals.user.id);
	const progressByCampaign = Object.fromEntries(
		gameState.campaignProgress.map((entry) => [entry.campaignId, entry])
	);

	return {
		progressByCampaign
	};
};