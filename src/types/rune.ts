import type { ItemMinimumPrice } from "@custom-types/items"
import { Metadata } from "./common"

export interface Runes {
	_etag: string
	_items: Rune[]
	_metadata: Metadata
}

export interface Rune {
	rune: string
	class: string
	craftable: boolean
	weight: number
	hp: number
	hpPct: number
	item: RuneInfo
	season?: Season
	_etag: string
}

export interface ParsedRune extends Rune {
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

export interface RuneInfo {
	id: string
	displayOrder: number
	category: string
	rarity: string
	description: string
	name: string
	tokenStandard: string
	tokenAddress: string
	tokenId: string
	imageUrl: string
}
