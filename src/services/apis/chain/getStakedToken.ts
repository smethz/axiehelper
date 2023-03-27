import { getTokenPrice } from "@apis/getTokenPrice"
import {
	AXS_STAKING_POOL_CONTRACT_ADDRESS,
	RON_AXS_LP_STAKING_POOL_CONTRACT_ADDRESS,
	RON_SLP_LP_STAKING_POOL_CONTRACT_ADDRESS,
	RON_USDC_LP_STAKING_POOL_CONTRACT_ADDRESS,
	RON_WETH_LP_STAKING_POOL_CONTRACT_ADDRESS,
} from "@constants/contracts/addresses"
import emoji from "@constants/props/emojis.json"
import { GetPairsQuery } from "@constants/queries"
import { RoninAddress } from "@custom-types/common"
import { Pair, ParsedUserRewardInfo, StakedToken, StakedTokenPair, UserRewardInfo } from "@custom-types/stakes"
import {
	AxsStakeContract,
	RonAxsContract,
	RonSlpContract,
	RonUsdcContract,
	RonWethContract,
	StakingManagerContract,
} from "@services/rpc"
import { currencyFormatter } from "@utils/currencyFormatter"
import { parseAddress } from "@utils/parsers"
import axios from "axios"
import logger from "pino-logger"

export interface PooledToken {
	data: Data
}

export interface Data {
	pairs: [RON_WETH_Pair, RON_AXS_Pair, RON_SLP_Pair, RON_USDC_Pair]
}

type RON_WETH_Pair = Pair
type RON_AXS_Pair = Pair
type RON_SLP_Pair = Pair
type RON_USDC_Pair = Pair

type TokenSelection = "SLP" | "AXS" | "ETH" | "USDC"

export async function getPooledTokens(): Promise<void | [RON_WETH_Pair, RON_AXS_Pair, RON_USDC_Pair, RON_SLP_Pair]> {
	const url = "https://thegraph.roninchain.com/subgraphs/name/axieinfinity/katana-subgraph-blue"

	const pooledTokens = await axios
		.post<PooledToken>(url, { query: GetPairsQuery }, { headers: { "content-type": "application/json" } })
		.then((response) => response?.data?.data?.pairs)
		.catch((e) => logger.error(e.message))

	return pooledTokens
}

export async function getStakedTokens(roninAddress: RoninAddress, currency: string = "USD") {
	roninAddress = parseAddress(roninAddress, "ethereum")

	const pooledTokens = await getPooledTokens()

	if (!pooledTokens) return

	const stakedTokens = await Promise.all([
		getStakedAXS(roninAddress, currency),
		getStakedTokenPair(roninAddress, "AXS", currency, pooledTokens),
		getStakedTokenPair(roninAddress, "SLP", currency, pooledTokens),
		getStakedTokenPair(roninAddress, "USDC", currency, pooledTokens),
		getStakedTokenPair(roninAddress, "ETH", currency, pooledTokens),
	]).catch((e) => logger.error(e))

	return stakedTokens
}

export async function getStakedAXS(roninAddress: string, currency: string = "USD"): Promise<StakedToken> {
	const axsPrice = await getTokenPrice("axs", currency ?? "USD")

	let pendingRewards = await AxsStakeContract.getPendingRewards(roninAddress)
	pendingRewards = parseFloat(pendingRewards) / 1e18
	pendingRewards = Number(pendingRewards.toFixed(10))

	let stakedAmount = await AxsStakeContract.getStakingAmount(roninAddress)
	stakedAmount = parseFloat(stakedAmount) / 1e18
	stakedAmount = Number(stakedAmount.toFixed(10))

	let totalStake = await AxsStakeContract.getStakingTotal()
	totalStake = Number(totalStake / 1e18)

	const userRewardInfo = await getUserRewardInfo(AXS_STAKING_POOL_CONTRACT_ADDRESS, roninAddress)

	const daily_reward = 50_516.13
	let estimatedApr = (daily_reward / totalStake) * 100 * 365
	estimatedApr = Number(estimatedApr.toFixed(2))

	let estimated_daily_reward = (estimatedApr / 365 / 100) * parseFloat(stakedAmount)
	estimated_daily_reward = Number(estimated_daily_reward.toFixed(4))

	const stakedAXS = {
		pending_reward: pendingRewards,
		amount_staked: stakedAmount,
		isClaimable: userRewardInfo.isClaimable,
		total_staked: totalStake.toLocaleString("en-US"),
		last_claim_timestamp: userRewardInfo.last_claim_timestamp,
		next_claim_timestamp: userRewardInfo.next_claim_timestamp,
		daily_reward,
		estimated_apr: Math.floor(estimatedApr),
		estimated_daily_reward,
		title: emoji.tokens.axs + " AXS Staking",
		url: "https://stake.axieinfinity.com/",
		stake_emoji: emoji.tokens.axs,
		reward_emoji: emoji.tokens.axs,
		pending_reward_price:
			pendingRewards > 0 && currency && currency !== "NONE"
				? `(${currencyFormatter(currency, pendingRewards, axsPrice.price)})`
				: ``,
		amount_staked_price:
			stakedAmount > 0 && currency && currency !== "NONE"
				? `(${currencyFormatter(currency, stakedAmount, axsPrice.price)})`
				: ``,
		estimated_daily_reward_price:
			estimated_daily_reward > 0 && currency && currency !== "NONE"
				? `(${currencyFormatter(currency, estimated_daily_reward, axsPrice.price)})`
				: ``,
	}

	return stakedAXS
}

export async function getStakedTokenPair(
	roninAddress: RoninAddress,
	token: TokenSelection,
	currency: string | null,
	pooledTokens: [RON_WETH_Pair, RON_AXS_Pair, RON_SLP_Pair, RON_USDC_Pair]
): Promise<StakedTokenPair> {
	const { contract, contractAddress, dailyRewards, pooledPairs, ...tokenInfo } = getTokenPairInfo(token, pooledTokens)

	let pendingReward = await contract.getPendingRewards(roninAddress)
	pendingReward = parseFloat(pendingReward) / 1e18
	pendingReward = Number(pendingReward.toFixed(4))

	let stakedAmount = await contract.getStakingAmount(roninAddress)
	stakedAmount = parseFloat(stakedAmount)
	stakedAmount = (stakedAmount / 1e18).toFixed(13)

	let totalStake = await contract.getStakingTotal()
	totalStake = parseFloat(totalStake) / 1e18

	const pooledToken = parseFloat(pooledPairs.reserve0)
	const pooledRON = parseFloat(pooledPairs.reserve1)

	const [tokenPrice, ron] = await Promise.all([
		getTokenPrice(token, currency ?? "USD"),
		getTokenPrice("ron", currency ?? "USD"),
	])

	const tvl = pooledRON * ron?.price + pooledToken * tokenPrice?.price

	let estimated_apr = ((dailyRewards * ron?.price) / tvl) * 100 * 365
	estimated_apr = Number(estimated_apr.toFixed(2))

	let estimated_daily_reward = (stakedAmount / totalStake) * dailyRewards
	estimated_daily_reward = Number(estimated_daily_reward.toFixed(4))

	let liquidity_position = (stakedAmount / totalStake) * tvl
	let liquidity_position_token0 = liquidity_position / 2 / ron.price
	let liquidity_position_token1 = liquidity_position / 2 / tokenPrice.price

	liquidity_position = Number(liquidity_position.toFixed(4))
	liquidity_position_token0 = Number(liquidity_position_token0.toFixed(4))
	liquidity_position_token1 = Number(liquidity_position_token1.toFixed(4))

	const userRewardInfo = await getUserRewardInfo(contractAddress, roninAddress)

	const stakedTokenPair = {
		...tokenInfo,
		liquidity_position,
		liquidity_position_token0,
		liquidity_position_token1,
		reserve0: pooledRON,
		reserve1: pooledToken,
		pending_reward: pendingReward,
		amount_staked: stakedAmount,
		total_staked: Number(totalStake.toFixed(7)),
		daily_reward: dailyRewards,
		estimated_apr: Math.round(estimated_apr),
		estimated_daily_reward,
		isClaimable: userRewardInfo.isClaimable,
		last_claim_timestamp: userRewardInfo.last_claim_timestamp,
		next_claim_timestamp: userRewardInfo.next_claim_timestamp,

		liquidity_position_token0_price:
			liquidity_position_token0 > 0 && currency && currency !== "NONE"
				? `(${currencyFormatter(currency, liquidity_position_token0, ron.price)})`
				: ``,
		liquidity_position_token1_price:
			liquidity_position_token1 > 0 && currency && currency !== "NONE"
				? `(${currencyFormatter(currency, liquidity_position_token1, tokenPrice.price)})`
				: ``,
		pending_reward_price:
			pendingReward > 0 && currency && currency !== "NONE"
				? `(${currencyFormatter(currency, pendingReward, ron.price)})`
				: ``,
		amount_staked_price:
			stakedAmount > 0 && currency && currency !== "NONE"
				? `(${currencyFormatter(currency, liquidity_position, 1)})`
				: ``,
		estimated_daily_reward_price:
			estimated_daily_reward > 0 && currency && currency !== "NONE"
				? `(${currencyFormatter(currency, estimated_daily_reward, ron.price)})`
				: ``,
	}

	return stakedTokenPair
}

export async function getUserRewardInfo(contractAddress: string, roninAddress: string): Promise<ParsedUserRewardInfo> {
	const userRewardInfo: UserRewardInfo = await StakingManagerContract.userRewardInfo(contractAddress, roninAddress)
	const lastClaimedTimestamp = Number(userRewardInfo.lastClaimedTimestamp)
	const DAY_IN_SECONDS = 86_400

	return {
		...userRewardInfo,
		isClaimable: lastClaimedTimestamp && Date.now() / 1000 >= lastClaimedTimestamp + DAY_IN_SECONDS ? true : false,
		next_claim_timestamp: (lastClaimedTimestamp ?? 0) + DAY_IN_SECONDS,
		last_claim_timestamp: lastClaimedTimestamp ?? 0,
	}
}

function getTokenPairInfo(
	token: TokenSelection,
	pooledPairs: [RON_WETH_Pair, RON_AXS_Pair, RON_SLP_Pair, RON_USDC_Pair]
) {
	const PAIR_INFO = {
		ETH: {
			contract: RonWethContract,
			contractAddress: RON_WETH_LP_STAKING_POOL_CONTRACT_ADDRESS,
			dailyRewards: 60_422.96,
			pooledPairs: pooledPairs[0],
			title: emoji.tokens.ron + emoji.tokens.weth + " RON/WETH Farming",
			liquidity_position_token0_emoji: emoji.tokens.ron,
			liquidity_position_token1_emoji: emoji.tokens.weth,
		},
		AXS: {
			contract: RonAxsContract,
			contractAddress: RON_AXS_LP_STAKING_POOL_CONTRACT_ADDRESS,
			dailyRewards: 24_169.18,
			pooledPairs: pooledPairs[1],
			title: emoji.tokens.ron + emoji.tokens.axs + " RON/AXS Farming",
			liquidity_position_token0_emoji: emoji.tokens.ron,
			liquidity_position_token1_emoji: emoji.tokens.axs,
		},
		SLP: {
			contract: RonSlpContract,
			contractAddress: RON_SLP_LP_STAKING_POOL_CONTRACT_ADDRESS,
			title: emoji.tokens.ron + emoji.tokens.slp + " RON/SLP Farming",
			pooledPairs: pooledPairs[3],
			dailyRewards: 12_084.59,
			liquidity_position_token0_emoji: emoji.tokens.ron,
			liquidity_position_token1_emoji: emoji.tokens.slp,
		},
		USDC: {
			contract: RonUsdcContract,
			contractAddress: RON_USDC_LP_STAKING_POOL_CONTRACT_ADDRESS,
			pooledPairs: pooledPairs[2],
			dailyRewards: 24_169.18,
			title: emoji.tokens.ron + emoji.tokens.usdc + " RON/USDC Farming",
			liquidity_position_token0_emoji: emoji.tokens.ron,
			liquidity_position_token1_emoji: emoji.tokens.usdc,
		},
	}

	return {
		...PAIR_INFO[token],
		stake_emoji: `LP ` + emoji.tokens.contract,
		reward_emoji: emoji.tokens.ron,
		url: "https://katana.roninchain.com/#/farm",
	}
}
