import { asc, desc, eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth.schema';
import { campaignProgress, pixlState, progressionLeaderboard } from '$lib/server/db/game.schema';

export interface ProgressionLeaderboardEntry {
	rank: number;
	userId: string;
	displayName: string;
	email: string;
	bestCampaignId: number;
	bestCampaignLevel: number;
	pixlLevel: number;
	totalXp: number;
	updatedAt: string;
}

function getReachedLevel(progress: { highestUnlockedLevel: number; highestClearedLevel: number }) {
	return Math.max(0, progress.highestClearedLevel, progress.highestUnlockedLevel - 1);
}

function compareProgress(
	left: { campaignId: number; reachedLevel: number },
	right: { campaignId: number; reachedLevel: number }
) {
	if (left.campaignId !== right.campaignId) {
		return right.campaignId - left.campaignId;
	}

	return right.reachedLevel - left.reachedLevel;
}

export async function syncProgressionLeaderboardForUser(userId: string) {
	const [userRow] = await db.select().from(user).where(eq(user.id, userId));
	const [pixlRow] = await db.select().from(pixlState).where(eq(pixlState.userId, userId));
	const progressRows = await db
		.select()
		.from(campaignProgress)
		.where(eq(campaignProgress.userId, userId));

	if (!userRow || !pixlRow || progressRows.length === 0) {
		return;
	}

	const bestProgress = progressRows
		.map((progress) => ({
			campaignId: progress.campaignId,
			reachedLevel: getReachedLevel(progress)
		}))
		.sort(compareProgress)[0] ?? { campaignId: 1, reachedLevel: 0 };

	const displayName = userRow.name.trim().length > 0 ? userRow.name : userRow.email;
	const now = new Date();

	await db
		.insert(progressionLeaderboard)
		.values({
			userId,
			displayName,
			email: userRow.email,
			bestCampaignId: bestProgress.campaignId,
			bestCampaignLevel: bestProgress.reachedLevel,
			pixlLevel: pixlRow.level,
			totalXp: pixlRow.xp,
			createdAt: now,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: progressionLeaderboard.userId,
			set: {
				displayName,
				email: userRow.email,
				bestCampaignId: bestProgress.campaignId,
				bestCampaignLevel: bestProgress.reachedLevel,
				pixlLevel: pixlRow.level,
				totalXp: pixlRow.xp,
				updatedAt: now
			}
		});
}

export async function getTopProgressionLeaders(limit = 5): Promise<ProgressionLeaderboardEntry[]> {
	const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
	const rows = await db
		.select()
		.from(progressionLeaderboard)
		.orderBy(
			desc(progressionLeaderboard.bestCampaignId),
			desc(progressionLeaderboard.bestCampaignLevel),
			desc(progressionLeaderboard.pixlLevel),
			desc(progressionLeaderboard.totalXp),
			asc(progressionLeaderboard.updatedAt)
		)
		.limit(safeLimit);

	return rows.map((row, index) => ({
		rank: index + 1,
		userId: row.userId,
		displayName: row.displayName,
		email: row.email,
		bestCampaignId: row.bestCampaignId,
		bestCampaignLevel: row.bestCampaignLevel,
		pixlLevel: row.pixlLevel,
		totalXp: row.totalXp,
		updatedAt: row.updatedAt.toISOString()
	}));
}

export async function isTopProgressionLeader(userId: string) {
	const [leader] = await db
		.select({ userId: progressionLeaderboard.userId })
		.from(progressionLeaderboard)
		.orderBy(
			desc(progressionLeaderboard.bestCampaignId),
			desc(progressionLeaderboard.bestCampaignLevel),
			desc(progressionLeaderboard.pixlLevel),
			desc(progressionLeaderboard.totalXp),
			asc(progressionLeaderboard.updatedAt)
		)
		.limit(1);

	return leader?.userId === userId;
}
