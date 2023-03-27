import { Metadata } from "./common"

export interface Cards {
	_etag: string
	_items: Card[]
	_metadata: Metadata
}

export interface Card {
	id: number
	name: string
	description: string
	partClass: string
	partType: string
	partValue: number
	energy: number
	attack: number
	defense: number
	healing: number
	abilityType: string
	level: number
	tags: string[]
	_etag: string
}

export interface ParsedCard extends Card {
	emoji: string
	color: string
}

export interface OriginCard {
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
	level: number
	tags: string[]
	_etag: string
}

export enum AbilityType {
	AttackMelee = "AttackMelee",
	AttackRanged = "AttackRanged",
	Power = "Power",
	Secret = "Secret",
	Skill = "Skill",
}

export enum PartClass {
	Aquatic = "Aquatic",
	Beast = "Beast",
	Bird = "Bird",
	Bug = "Bug",
	Dawn = "Dawn",
	Dusk = "Dusk",
	Mech = "Mech",
	Plant = "Plant",
	Reptile = "Reptile",
}

export enum PartType {
	Back = "Back",
	Ears = "Ears",
	Eyes = "Eyes",
	Horn = "Horn",
	Mouth = "Mouth",
	Tail = "Tail",
}
