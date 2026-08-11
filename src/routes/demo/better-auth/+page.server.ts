import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	throw redirect(302, event.locals.user ? '/dashboard' : '/auth');
};
