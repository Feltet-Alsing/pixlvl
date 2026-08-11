import { error, fail } from '@sveltejs/kit';

import { getCampaign, getCampaignCombatProfile } from '$lib/data';
import { applyUpgradePurchase, isUpgradeKey } from '$lib/game/upgrades';
import {
	getCampaignProgressForUser,
	getOrCreateGameState,
	updateGameState
} from '$lib/server/game-state';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const campaignId = Number(params.campaignId);

	if (!Number.isInteger(campaignId)) {
		throw error(404, 'Campaign not found');
	}

	try {
		const campaign = getCampaign(campaignId);
		const combatProfile = getCampaignCombatProfile(campaignId);
		const gameState = locals.user ? await getOrCreateGameState(locals.user.id) : null;
		const campaignState = locals.user
			? await getCampaignProgressForUser(locals.user.id, campaignId)
			: null;

		return {
			campaignId,
			campaign,
			combatProfile,
			gameState,
			campaignState
		};
	} catch {
		throw error(404, 'Campaign not found');
	}
};

export const actions: Actions = {
	purchaseUpgrade: async ({ request, locals, params }) => {
		if (!locals.user) {
			return fail(401, { purchaseError: 'Sign in to buy upgrades.' });
		}

		const campaignId = Number(params.campaignId);

		if (!Number.isInteger(campaignId)) {
			return fail(404, { purchaseError: 'Campaign not found.' });
		}

		const formData = await request.formData();
		const rawUpgrade = formData.get('upgrade');

		if (typeof rawUpgrade !== 'string' || !isUpgradeKey(rawUpgrade)) {
			return fail(400, { purchaseError: 'Unknown upgrade selection.' });
		}

		const gameState = await getOrCreateGameState(locals.user.id);

		try {
			const nextPixlState = applyUpgradePurchase(rawUpgrade, gameState.pixlState);

			await updateGameState(locals.user.id, {
				pixlState: {
					gold: nextPixlState.gold,
					health: nextPixlState.health,
					damage: nextPixlState.damage,
					attackSpeed: nextPixlState.attackSpeed,
					healthUpgrades: nextPixlState.healthUpgrades,
					damageUpgrades: nextPixlState.damageUpgrades,
					attackSpeedUpgrades: nextPixlState.attackSpeedUpgrades
				}
			});

			return {
				purchaseSuccess: `${rawUpgrade} upgraded`
			};
		} catch (err) {
			return fail(400, {
				purchaseError: err instanceof Error ? err.message : 'Upgrade purchase failed.'
			});
		}
	}
};
