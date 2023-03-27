export interface Pair {
	id: string
	token0: Token
	token1: Token
	reserve0: string
	reserve1: string
}

export interface Token {
	id: string
	symbol: string
	name: string
}

export interface StakedToken {
	pending_reward: number
	amount_staked: number
	total_staked: number
	daily_reward: number
	estimated_apr: number
	estimated_daily_reward: number
	isClaimable: boolean
	last_claim_timestamp: number
	next_claim_timestamp: number
	title: string
	url: string
	stake_emoji: string
	reward_emoji: string
	pending_reward_price: string
	amount_staked_price: string
	estimated_daily_reward_price: string
}

export interface StakedTokenPair extends StakedToken {
	liquidity_position: number
	liquidity_position_token0: number
	liquidity_position_token1: number
	reserve0: number
	reserve1: number

	liquidity_position_token0_emoji: string
	liquidity_position_token1_emoji: string

	liquidity_position_token0_price: string
	liquidity_position_token1_price: string
}

export interface UserRewardInfo {
	debitedRewards: number
	creditedRewards: number
	lastClaimedTimestamp: number
}

export interface ParsedUserRewardInfo extends UserRewardInfo {
	isClaimable: boolean
	last_claim_timestamp: number
	next_claim_timestamp: number
}
