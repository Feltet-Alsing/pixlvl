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

import type { LoadoutPlacement, OwnedWeaponInstance } from '$lib/data/types';

import { user } from './auth.schema';

export const pixlState = pgTable('pixl_state', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	xp: integer('xp').notNull().default(0),
	level: integer('level').notNull().default(1),
	perkPoints: integer('perk_points').notNull().default(0),
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
		.$type<LoadoutPlacement[]>()
		.notNull()
		.default(sql`'[]'::jsonb`),
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
