import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { resetGameStateForUser } from '$lib/server/game-state';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user || !event.locals.session) {
		throw redirect(302, '/auth/login');
	}

	return {
		user: event.locals.user,
		session: event.locals.session
	};
};

export const actions: Actions = {
	signOut: async (event) => {
		await auth.api.signOut({
			headers: event.request.headers
		});

		throw redirect(302, '/auth/login');
	},
	resetPixl: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const confirmation = formData.get('confirmation');

		if (typeof confirmation !== 'string' || confirmation.trim() !== 'DELETE') {
			return fail(400, {
				resetError: 'Type DELETE to confirm the reset.'
			});
		}

		await resetGameStateForUser(locals.user.id);

		return {
			resetSuccess: 'All pixl data deleted.'
		};
	}
};
