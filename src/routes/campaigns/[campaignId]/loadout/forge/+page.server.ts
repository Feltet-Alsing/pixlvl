import {
	scrapOwnedWeaponsForUser,
	toActionFailure,
	upgradeOwnedWeaponForUser
} from '$lib/server/campaign-route';

import type { Actions } from './$types';

export const actions: Actions = {
	scrapItems: async ({ request, locals }) => {
		const result = await scrapOwnedWeaponsForUser(locals.user?.id, await request.formData());

		return toActionFailure(result);
	},
	upgradeWeapon: async ({ request, locals }) => {
		const result = await upgradeOwnedWeaponForUser(locals.user?.id, await request.formData());

		return toActionFailure(result);
	}
};
