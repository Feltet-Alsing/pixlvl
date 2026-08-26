import { auth } from '$lib/server/auth';
import { getOrCreateGameState } from '$lib/server/game-state';
import { getTopProgressionLeaders, isTopProgressionLeader } from '$lib/server/leaderboard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const gameState = event.locals.user ? await getOrCreateGameState(event.locals.user.id) : null;
	const topLeaders = await getTopProgressionLeaders(5);
	const isTopLeader = event.locals.user
		? await isTopProgressionLeader(event.locals.user.id)
		: false;

	return {
		user: event.locals.user ?? null,
		session: event.locals.session ?? null,
		gameState,
		topLeaders,
		isTopLeader
	};
};

export const actions: Actions = {
	signOut: async (event) => {
		await auth.api.signOut({
			headers: event.request.headers
		});

		return {
			signedOut: true
		};
	}
};
