import { relations, sql } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	real,
	text,
	timestamp
} from 'drizzle-orm/pg-core';

import type {
	DungeonKeyInventory,
	OwnedWeaponInstance,
	PersistedLoadoutState,
	PersistedRewardPackCard
} from '$lib/data/types';

import { user } from './auth.schema';

export const pixlState = pgTable('pixl_state', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	xp: integer('xp').notNull().default(0),
	level: integer('level').notNull().default(1),
	perkPoints: integer('perk_points').notNull().default(0),
	scrap: integer('scrap').notNull().default(0),
	defence: integer('defence').notNull().default(0),
	agility: integer('agility').notNull().default(0),
	health: integer('health').notNull(),
	attackSpeed: real('attack_speed').notNull(),
	loadoutRows: integer('loadout_rows').notNull().default(3),
	loadoutColumns: integer('loadout_columns').notNull().default(6),
	acknowledgedPerkPoints: integer('acknowledged_perk_points').notNull().default(0),
	acknowledgedWeaponDefinitionIds: jsonb('acknowledged_weapon_definition_ids')
		.$type<string[]>()
		.notNull()
		.default(sql`'[]'::jsonb`),
	dungeonKeys: jsonb('dungeon_keys')
		.$type<DungeonKeyInventory>()
		.notNull()
		.default(
			sql`'{"dungeon-1-key":0,"dungeon-2-key":0,"dungeon-3-key":0,"dungeon-4-key":0,"dungeon-5-key":0}'::jsonb`
		),
	ownedWeapons: jsonb('owned_weapons')
		.$type<OwnedWeaponInstance[]>()
		.notNull()
		.default(sql`'[]'::jsonb`),
	loadoutPlacements: jsonb('loadout_placements')
		.$type<PersistedLoadoutState>()
		.notNull()
		.default(sql`'{"activeSlot":0,"slots":[[],[],[]]}'::jsonb`),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

export const campaignProgress = pgTable(
	'campaign_progress',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		campaignId: integer('campaign_id').notNull(),
		currentLevel: integer('current_level').notNull().default(1),
		highestUnlockedLevel: integer('highest_unlocked_level').notNull().default(1),
		highestClearedLevel: integer('highest_cleared_level').notNull().default(0),
		completed: boolean('completed').notNull().default(false),
		lastPlayedAt: timestamp('last_played_at').defaultNow().notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.campaignId] }),
		index('campaign_progress_user_id_idx').on(table.userId)
	]
);

export const rewardPack = pgTable(
	'reward_pack',
	{
		id: text('id').primaryKey(),
		ownerUserId: text('owner_user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		campaignId: integer('campaign_id').notNull(),
		sourceCampaignLevel: integer('source_campaign_level').notNull(),
		kind: text('kind').notNull().default('normal'),
		droppedAt: timestamp('dropped_at').defaultNow().notNull(),
		openedAt: timestamp('opened_at'),
		status: text('status').notNull().default('unopened'),
		cardCount: integer('card_count').notNull(),
		guaranteedSlotIndex: integer('guaranteed_slot_index').notNull(),
		contentVersion: integer('content_version').notNull().default(1),
		cards: jsonb('cards').$type<PersistedRewardPackCard[]>().notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('reward_pack_owner_user_id_idx').on(table.ownerUserId),
		index('reward_pack_owner_status_idx').on(table.ownerUserId, table.status)
	]
);

export const dungeonProgress = pgTable(
	'dungeon_progress',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		dungeonId: integer('dungeon_id').notNull(),
		currentFloor: integer('current_floor').notNull().default(1),
		highestUnlockedFloor: integer('highest_unlocked_floor').notNull().default(1),
		highestClearedFloor: integer('highest_cleared_floor').notNull().default(0),
		runActive: boolean('run_active').notNull().default(false),
		completed: boolean('completed').notNull().default(false),
		lastPlayedAt: timestamp('last_played_at').defaultNow().notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.dungeonId] }),
		index('dungeon_progress_user_id_idx').on(table.userId)
	]
);

export const progressionLeaderboard = pgTable(
	'progression_leaderboard',
	{
		userId: text('user_id')
			.primaryKey()
			.references(() => user.id, { onDelete: 'cascade' }),
		displayName: text('display_name').notNull(),
		email: text('email').notNull(),
		bestCampaignId: integer('best_campaign_id').notNull().default(1),
		bestCampaignLevel: integer('best_campaign_level').notNull().default(0),
		pixlLevel: integer('pixl_level').notNull().default(1),
		totalXp: integer('total_xp').notNull().default(0),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('progression_leaderboard_rank_idx').on(
			table.bestCampaignId,
			table.bestCampaignLevel,
			table.pixlLevel,
			table.totalXp
		)
	]
);

export const pixlStateRelations = relations(pixlState, ({ one }) => ({
	user: one(user, {
		fields: [pixlState.userId],
		references: [user.id]
	})
}));

export const campaignProgressRelations = relations(campaignProgress, ({ one }) => ({
	user: one(user, {
		fields: [campaignProgress.userId],
		references: [user.id]
	})
}));

export const rewardPackRelations = relations(rewardPack, ({ one }) => ({
	user: one(user, {
		fields: [rewardPack.ownerUserId],
		references: [user.id]
	})
}));

export const dungeonProgressRelations = relations(dungeonProgress, ({ one }) => ({
	user: one(user, {
		fields: [dungeonProgress.userId],
		references: [user.id]
	})
}));

export const progressionLeaderboardRelations = relations(progressionLeaderboard, ({ one }) => ({
	user: one(user, {
		fields: [progressionLeaderboard.userId],
		references: [user.id]
	})
}));
