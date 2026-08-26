import type { UtilityVisual, WeaponProjectileVisual } from '$lib/data/types';

export const sharedProjectileVisualById = {
	'target-painter': {
		color: '#facc15',
		size: 'small',
		shape: 'spark',
		trail: 'pulse',
		glow: true
	},
	'the-knife': {
		color: '#f1f5f9',
		size: 'small',
		shape: 'knife',
		trail: 'streak'
	},
	'pea-shooter': {
		color: '#67d96f',
		size: 'small'
	},
	'the-mine': {
		color: '#f8fafc',
		size: 'medium',
		shape: 'diamond',
		trail: 'pulse',
		glow: true
	},
	'cluster-mines': {
		color: '#5eead4',
		size: 'small',
		shape: 'diamond',
		trail: 'pulse',
		glow: true
	},
	'mark-beacon': {
		color: '#fde047',
		size: 'small',
		shape: 'spark',
		trail: 'pulse',
		glow: true
	},
	'cold-lattice': {
		color: '#7dd3fc',
		size: 'small',
		shape: 'diamond',
		trail: 'pulse',
		glow: true
	},
	'ember-rods': {
		color: '#fb7185',
		size: 'small',
		shape: 'spark',
		trail: 'pulse',
		glow: true
	},
	'coldwire-rods': {
		color: '#67e8f9',
		size: 'small',
		shape: 'spark',
		trail: 'pulse',
		glow: true
	},
	'sunder-rods': {
		color: '#fbbf24',
		size: 'small',
		shape: 'diamond',
		trail: 'pulse',
		glow: true
	},
	'mine-calibrator': {
		color: '#fb923c',
		size: 'medium',
		shape: 'diamond',
		trail: 'pulse',
		glow: true
	},
	'hemorrhage-relay': {
		color: '#ef4444',
		size: 'medium',
		shape: 'spark',
		trail: 'pulse',
		glow: true
	},
	'shrapnel-mine': {
		color: '#f59e0b',
		size: 'medium',
		shape: 'diamond',
		trail: 'pulse',
		glow: true
	},
	'napalm-mine': {
		color: '#ef4444',
		size: 'medium',
		shape: 'diamond',
		trail: 'pulse',
		glow: true
	},
	'turret-mine': {
		color: '#fbbf24',
		size: 'medium',
		shape: 'diamond',
		trail: 'pulse',
		glow: true
	},
	blaster: {
		color: '#ff4d4d',
		size: 'large'
	},
	'kill-switch': {
		color: '#f97316',
		size: 'small',
		shape: 'spark',
		trail: 'pulse',
		glow: true
	},
	needle: {
		color: '#f8f8f8',
		size: 'small',
		shape: 'spark',
		glow: true
	},
	splitter: {
		color: '#ffd84d',
		size: 'small'
	},
	'heavy-orb': {
		color: '#d44a38',
		size: 'large',
		shape: 'orb',
		glow: true
	},
	'fan-of-knives': {
		color: '#fca5a5',
		size: 'small',
		shape: 'diamond',
		trail: 'streak',
		glow: true
	},
	'tide-caster': {
		color: '#67e8f9',
		size: 'medium',
		shape: 'orb',
		trail: 'pulse',
		glow: true
	},
	'redline-sniper': {
		color: '#ef4444',
		size: 'small',
		shape: 'spark',
		trail: 'streak',
		glow: true
	},
	'deadeye-sniper': {
		color: '#f8fafc',
		size: 'small',
		shape: 'spark',
		trail: 'streak',
		glow: true
	}
} satisfies Record<string, WeaponProjectileVisual>;

export const sharedUtilityVisualById = {
	'hemorrhage-burst': {
		color: '#dc2626',
		shape: 'ring',
		glow: true
	},
	'blood-catalyst': {
		color: '#ef4444',
		shape: 'column-glow',
		glow: true
	},
	'siphoning-knife': {
		color: '#7f1d1d',
		shape: 'column-glow',
		glow: true
	},
	'mine-echo': {
		color: '#2dd4bf',
		shape: 'column-glow',
		glow: true
	},
	'gravity-mine-augment': {
		color: '#8b5cf6',
		shape: 'column-glow',
		glow: true
	},
	'oathbreaker-sigil': {
		color: '#f59e0b',
		shape: 'ring',
		glow: true
	}
} satisfies Record<string, UtilityVisual>;
