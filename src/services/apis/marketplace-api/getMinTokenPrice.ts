import { GetMinPriceQuery } from "@constants/queries"
import { ItemMinimumPrice, TokenType } from "@custom-types/items"
import { MarketplaceAPI } from "@services/api"
import logger from "pino-logger"

export async function getMinTokenPrice(tokenIds: string[], tokenType: TokenType): Promise<ItemMinimumPrice[] | void> {
	return MarketplaceAPI.post<APIMinPriceResponse>("", {
		query: GetMinPriceQuery,
		variables: { tokenIds, tokenType, size: tokenIds.length },
	})
		.then((request) => request.data.data.erc1155Tokens.results.filter((token) => token.minPrice))
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
