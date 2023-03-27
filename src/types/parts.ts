export interface Part {
	part_id: string
	class: Class
	special_genes: SpecialGenes
	type: Type
	name: string
	ability_id: string
	skin?: number
	originCard: OriginCard
}

export enum Class {
	Aquatic = "aquatic",
	Beast = "beast",
	Bird = "bird",
	Bug = "bug",
	Plant = "plant",
	Reptile = "reptile",
}

export interface OriginCard {
	id: string
	cardId: string
	partClass: PartClass
	partType: PartType
	partValue: string
	class: Class
	type: Type
	cardName: string
	description: string
	defaultEnergy: number
	defaultAttack: number
	defaultDefense: number
	healing: number
	abilityType: AbilityType
	level: number
	tags: Tag[]
	specialGenes: SpecialGenes
	partId: string
	name: string
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

export enum SpecialGenes {
	Bionic = "bionic",
	Empty = "",
	Japan = "japan",
	Mystic = "mystic",
	Summer2022 = "summer-2022",
	Xmas2018 = "xmas-2018",
	Xmas2019 = "xmas-2019",
}

export enum Tag {
	Banish = "Banish",
	Innate = "Innate",
	Retain = "Retain",
}

export enum Type {
	Back = "back",
	Ears = "ears",
	Eyes = "eyes",
	Horn = "horn",
	Mouth = "mouth",
	Tail = "tail",
}
