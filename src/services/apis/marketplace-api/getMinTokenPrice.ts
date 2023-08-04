import { GetMinPriceQuery } from "@constants/queries"
import { MARKETPLACE_GRAPHQL_API } from "@constants/url"
import { ItemMinimumPrice, TokenType } from "@custom-types/items"
import { cache } from "@services//cache"
import { getCharmsList, getRunesList } from "@utils/getItemList"
import { splitArray } from "@utils/splitArray"
import { batchRequests } from "graphql-request"
import logger from "pino-logger"

export async function getMinTokenPrice(): Promise<ItemMinimumPrice[] | void> {
	const cacheKey = `min_tokenprice`
	const cacheEntry = await cache.get(cacheKey)
	const cacheExpiration = 60 * 15 // 15 minutes in seconds

	if (cacheEntry) return JSON.parse(cacheEntry)

	const runesList = getRunesList()
	const charmsList = getCharmsList()

	const validRunes = runesList
		.filter((rune) => rune.craftable && rune.item.tokenId && rune.item.id.endsWith("_nft"))
		.map((rune) => rune.item.tokenId)

	const validCharms = charmsList
		.filter((charm) => charm.craftable && charm.item.tokenId && charm.item.id.endsWith("_nft"))
		.map((charm) => charm.item.tokenId)

	const maxSize = 100

	const splitRuneRequest = splitArray(validRunes, maxSize).map((token, index) => {
		return {
			document: GetMinPriceQuery,
			variables: { from: index * maxSize, size: maxSize, tokenIds: token, tokenType: TokenType.Rune },
		}
	})

	const splitCharmRequest = splitArray(validCharms, maxSize).map((request, index) => {
		return {
			document: GetMinPriceQuery,
			variables: { from: index * maxSize, size: maxSize, tokenIds: request, tokenType: TokenType.Charm },
		}
	})

	return batchRequests(MARKETPLACE_GRAPHQL_API, [...splitRuneRequest, ...splitCharmRequest])
		.then(async (requests) => {
			let prices: ItemMinimumPrice[] = []

			for (const request of requests) {
				const items = (request.data as MinPriceData).erc1155Tokens.results
				prices = [...prices, ...items]
			}

			await cache.set(cacheKey, JSON.stringify(prices), "EX", cacheExpiration)

			return prices.filter((token) => token.minPrice)
		})
		.catch((error) => logger.error(error, `MarketplaceAPI Error: getMinimumTokenPrice`))
}

export interface APIMinPriceResponse {
	data: MinPriceData
}

export interface MinPriceData {
	erc1155Tokens: Erc1155Tokens
}

export interface Erc1155Tokens {
	results: ItemMinimumPrice[]
}
