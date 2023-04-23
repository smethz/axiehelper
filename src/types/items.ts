import { ParsedCharm } from "./charm"
import { UserID } from "./common"
import { ParsedRune } from "./rune"

export interface PlayerItem {
	userId: UserID
	itemId: string
	quantity: number
	withdrawable?: number
	nextWithdrawTime?: number
	rune?: ParsedRune
	charm?: ParsedCharm
}

export type PlayerItems = PlayerItem[]

export interface Rune {
	rune: string
	class: string
	craftable: boolean
	weight: number
	hp: number
	hpPct: number
	item: Item
	season: Season | null
	_etag: string
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
	item: Item
	season: Season | null
	_etag: string
}

export interface Season {
	id: number
	name: string
}

export interface Item {
	id: string
	displayOrder: number
	category: string
	rarity: ItemRarity
	description: string
	name: string
	tokenStandard: string
	tokenAddress: string
	tokenId?: string
	imageUrl: string
}

export enum ItemRarity {
	Common = "Common",
	Rare = "Rare",
	Epic = "Epic",
	Mystic = "Mystic",
}

export enum ItemWeight {
	Common = 1,
	Rare = 2,
	Epic = 3,
	Mystic = 4,
}

export enum ItemClass {
	Aquatic = "Aquatic",
	Beast = "Beast",
	Bird = "Bird",
	Bug = "Bug",
	Plant = "Plant",
	Reptile = "Reptile",
	Mech = "Mech",
	Dawn = "Dawn",
	Dusk = "Dusk",
	Neutral = "Neutral",
}

export interface ItemMinimumPrice {
	id: string
	tokenId: string
	minPrice: string // Minimum Price in ETH
	tokenType: TokenType
}

export enum TokenType {
	Charm = "Charm",
	Rune = "Rune",
}
