import type { ItemMinimumPrice } from "./items"

export type RoninAddress = string
export type UserID = string

export interface Metadata {
	total: number
	hasNext: boolean
	limit: number
	offset: number
}

declare global {
	var isClientReady: boolean
	var tokensPrice: ItemMinimumPrice[]
	var CURRENT_SEASON_ID: number
}
