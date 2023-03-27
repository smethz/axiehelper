import { RoninAddress } from "./common"

export interface PlayerIngameProfile {
	userID: string
	name: string
	level: number
	roninAddress: RoninAddress
	craftingLevel: number
	rank: Division
	tier: Tier
	vstar: number
	banUntil: number
	_etag: string
}

export interface ParsedPlayerIngameProfile extends PlayerIngameProfile {
	url: {
		axies_io: string
		marketplace: string
		explorer: string
	}
}

export type Tier = 0 | 1 | 2 | 3 | 4

export interface Ranks {
	division: Division
	tier: Tier
}

export enum Division {
	Egg = "Egg",
	Chick = "Chick",
	Hare = "Hare",
	Boar = "Boar",
	Wolf = "Wolf",
	Bear = "Bear",
	Tiger = "Tiger",
	Challenger = "Challenger",
}

export interface PlayerLeaderboardData {
	userID: string
	name: string
	rank: Division
	tier: Tier
	rankIcon: string
	topRank: number
	vstar: number
	avatar: string | null
	_etag: string
}
