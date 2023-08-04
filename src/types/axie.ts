export interface Axie {
	axpInfo: AxpInfo
	axpStatDay: AxpStatDay
	battleInfo: BattleInfo
	birthDate: number
	bodyShape: string | null
	breedCount: number
	chain: string
	children: Child[] | []
	class: AxieClass | null
	figure: Figure
	genes: string
	id: string
	image: string
	matronClass: string
	matronId: number
	name: string
	newGenes: string
	offers: Offers
	order?: Order
	owner: string
	ownerProfile?: OwnerProfile
	parts: Part[] | []
	potentialPoints: PotentialPoints
	sireClass: string
	sireId: number
	stage: number
	stats: Stats
	highestOffer: null
	numActiveOffers: number
	equipmentInstances: any[]
	title: string | null
	url: string
}

export enum AxieClass {
	Aquatic = "aquatic",
	Beast = "beast",
	Bird = "bird",
	Bug = "bug",
	Dawn = "dawn",
	Dusk = "dusk",
	Mech = "mech",
	Plant = "plant",
	Reptile = "reptile",
}

export interface AxpInfo {
	level: number
	nextOnchainLevel: number
	onchainLevel: number
	shouldAscend: boolean
	xp: number
	xpToLevelUp: number
}

export interface AxpStatDay {
	axieId: number
	axpAxieCapDay: number
	totalGainedAxpDay: number
	maxLevel: number
}

export interface BattleInfo {
	banUntil: string | null
	banned: boolean
	level: number
}

export interface Child {
	class: string
	id: string
	image: string
	name: string
	stage: number
	title: string
}

export interface Figure {
	atlas: string
	image: string
	model: string
}

export interface Offers {
	total: number
	data: any[]
}

export interface Order {
	assets: Asset[]
	basePrice: string
	currentPrice: string
	currentPriceUsd: string
	duration: number
	endedAt: number
	endedPrice: string
	expectedState: string
	expiredAt: number
	hash: string
	id: number
	kind: string
	maker: string
	marketFeePercentage: number
	nonce: number
	paymentToken: string
	signature: string
	startedAt: number
	suggestedPrice: string
	timeLeft: number
}

export interface Asset {
	address: string
	erc: string
	id: string
	orderId: number
	quantity: string
}

export interface OwnerProfile {
	accountId: string
	name: string
	settings: null
}

export interface Part {
	abilities: [Ability] | []
	class: AxieClass
	id: string
	name: string
	specialGenes: null
	stage: number
	type: string
}

export interface Ability {
	attack: number
	backgroundUrl: string
	defense: number
	description: string
	effectIconUrl: string
	energy: number
	id: string
	name: string
}

export interface PotentialPoints {
	aquatic: number
	beast: number
	bird: number
	bug: number
	dawn: number
	dusk: number
	mech: number
	plant: number
	reptile: number
}

export interface Stats {
	hp: number
	morale: number
	skill: number
	speed: number
}
