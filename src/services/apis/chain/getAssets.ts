import { DEFAULT_CACHE_EXPIRATION } from "@constants/index"
import emojis from "@constants/props/emojis.json"
import { RONINCHAIN_API } from "@constants/url"
import { RoninAddress } from "@custom-types/common"
import { cache } from "@services/cache"
import { RoninRPC } from "@services/rpc"
import { parseAddress, parseBalance } from "@utils/parsers"
import axios from "axios"
import logger from "pino-logger"

interface Token {
	token_address: string
	token_name: string
	token_symbol: string
	token_decimals: number
	token_type: string
	token_id: string
	balance: string
}

export interface ParsedToken extends Token {
	parsed_balance: string
	emoji: string
}

export interface ParsedTokenBalances {
	results: ParsedToken[]
	total: number
	roninAddress: RoninAddress
}

const defaultAssetEmoji = emojis.tokens["contract"]
export async function getAssets(roninAddress: RoninAddress): Promise<ParsedTokenBalances | void> {
	roninAddress = parseAddress(roninAddress, "ethereum")

	const cacheKey = `assets:${roninAddress}`
	const cachedEntry = await cache.get(cacheKey)
	if (cachedEntry) return JSON.parse(cachedEntry)

	const roninBalance = (await RoninRPC.getBalance(roninAddress)).toString()

	return axios
		.get<ParsedTokenBalances>(`${RONINCHAIN_API}/tokenbalances/${roninAddress}`)
		.then(async (response) => {
			const tokens = response.data.results
			if (roninBalance || roninBalance !== "0") {
				tokens.unshift({
					token_address: "0xe514d9deb7966c8be0ca922de8a064264ea6bcd4",
					token_name: "Ronin",
					token_symbol: "RON",
					token_decimals: 18,
					token_type: "ERC20",
					token_id: "ERC20",
					balance: roninBalance,
					parsed_balance: parseBalance(roninBalance!, 18),
					emoji: emojis.tokens["ron"],
				})

				response.data.total = response.data.total + 1
			}

			for (const token of tokens) {
				const parsedTokenSymbol = token.token_symbol.toLowerCase().replace(" ", "_")
				token.parsed_balance = parseBalance(token.balance, token.token_decimals)
				token.emoji = emojis.tokens[parsedTokenSymbol as keyof typeof emojis.tokens] || defaultAssetEmoji
			}

			await cache.set(cacheKey, JSON.stringify(response.data), "EX", DEFAULT_CACHE_EXPIRATION)
			return response.data
		})
		.catch((error) => logger.error(error, "Failed to fetch user assets"))
}
