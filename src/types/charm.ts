import type { ItemMinimumPrice, ItemRarity } from "@custom-types/items"
import { Metadata } from "./common"

export interface Charms {
	_etag: string
	_items: Charm[]
	_metadata: Metadata
}

export interface Charm {
	class: string
	potentialPoint: number
	code: string
	craftable: boolean
	weight: number
	tags: string[]
	energy: number
	hp: number
	damage: number
	shield: number
	heal: number
	hpPct: number
	damagePct: number
	shieldPct: number
	healPct: number
	item: CharmInfo
	season?: Season
	_etag: string
}

export interface ParsedCharm extends Charm {
	rarityEmoji: string
	classEmoji: string
	color: string
	listingUrl: string
	price?: ItemMinimumPrice
}

export interface Season {
	id: number
	name: string
}

export interface CharmInfo {
	id: string
	displayOrder: number
	category: string
	rarity: ItemRarity
	description: string
	name: string
	tokenStandard: string
	tokenAddress: string
	tokenId: string
	imageUrl: string
}
