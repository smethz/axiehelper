import { Metadata } from "./common"
import { AbilityType, PartClass, PartType } from "./parts"

export interface Cards {
	_etag: string
	_items: Card[]
	_metadata: Metadata
}

export interface Card {
	id: number
	name: string
	description: string
	partClass: PartClass
	partType: PartType
	partValue: number
	energy: number
	attack: number
	defense: number
	healing: number
	abilityType: AbilityType
	stage: number
	tags: string[]
	_etag: string
	color: string
	emoji: string
}

export interface ParsedCard extends Card {
	emoji: string
	color: string
}
