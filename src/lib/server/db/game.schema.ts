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
	gold: integer('gold').notNull().default(0),
	health: integer('health').notNull(),
	// damage: integer('damage').notNull(), // Commenting out damage for future reference
	attackSpeed: real('attack_speed').notNull(),
	healthUpgrades: integer('health_upgrades').notNull().default(0),
	// damageUpgrades: integer('damage_upgrades').notNull().default(0), // Commenting out damageUpgrades for future reference
	attackSpeedUpgrades: integer('attack_speed_upgrades').notNull().default(0),
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
