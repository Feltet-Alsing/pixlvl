import { auth } from '$lib/server/auth';
import { getOrCreateGameState } from '$lib/server/game-state';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const gameState = event.locals.user ? await getOrCreateGameState(event.locals.user.id) : null;

	return {
		user: event.locals.user ?? null,
		session: event.locals.session ?? null,
		gameState
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
