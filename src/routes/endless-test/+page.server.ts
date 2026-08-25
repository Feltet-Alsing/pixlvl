import { getOrCreateGameState } from '$lib/server/game-state';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return {
		user: locals.user ?? null,
		gameState: locals.user ? await getOrCreateGameState(locals.user.id) : null
	};
};