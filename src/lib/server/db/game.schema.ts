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
