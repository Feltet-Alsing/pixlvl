import { redirect } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';

const WEAPON_LAB_ADMIN_EMAIL = 'alsing3520@gmail.com';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user || !locals.session) {
		const next = encodeURIComponent(`${url.pathname}${url.search}`);
		throw redirect(302, `/auth/login?next=${next}`);
	}

	if (locals.user.email !== WEAPON_LAB_ADMIN_EMAIL) {
		throw redirect(302, '/campaigns');
	}

	return {};
};
