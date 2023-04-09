export interface Land {
	tokenId: string
	owner: string
	ownerProfile: OwnerProfile | null
	landType: LandType
	row: number
	col: number
	order: Order | null
	highestOffer: HighestOffer | null
	offers: Offers | null
	numActiveOffers: number
}

export interface ParsedLand extends Land {
	url: string
	emoji: string
	color: string
	image: string
	thumbnail_url: string
}

export enum LandType {
	Savannah = "Savannah",
	Forest = "Forest",
	Arctic = "Arctic",
	Mystic = "Mystic",
	Genesis = "Genesis",
}

export interface HighestOffer {
	id: number
	maker: string
	makerProfile: ErProfile
	kind: string
	expiredAt: number
	paymentToken: string
	startedAt: number
	basePrice: string
	endedAt: number
	endedPrice: string
	expectedState: string
	nonce: number
	marketFeePercentage: number
	signature: string
	hash: string
	duration: number
	timeLeft: number
	currentPrice: string
	suggestedPrice: string
	currentPriceUsd: string
	status: string
	assets: Asset[]
}

export interface Asset {
	erc: string
	address: string
	id: string
	quantity: string
	orderId: number
	token?: Token
}

export interface Token {
	landType: string
	row: number
	col: number
	owner: string
	ownerProfile: ErProfile
	assetType: string
}

export interface ErProfile {
	accountId: string
	name: string
	addresses: Addresses
}

export interface Addresses {
	ethereum: null | string
	tomo: null
	loom: string
	ronin: string
}

export interface Offers {
	total: number
	data: HighestOffer[]
}

export interface Order {
	id: number
	maker: string
	kind: string
	assets: Asset[]
	expiredAt: number
	paymentToken: string
	startedAt: number
	basePrice: string
	endedAt: number
	endedPrice: string
	expectedState: string
	nonce: number
	marketFeePercentage: number
	signature: string
	hash: string
	duration: number
	timeLeft: number
	currentPrice: string
	suggestedPrice: string
	currentPriceUsd: string
}

export interface OwnerProfile {
	name: string
}
