import { getTopProgressionLeaders } from '$lib/server/leaderboard';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return {
		user: locals.user ?? null,
		session: locals.session ?? null,
		topLeaders: await getTopProgressionLeaders(5)
	};
};
