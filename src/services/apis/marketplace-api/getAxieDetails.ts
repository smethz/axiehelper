import { GetAxieDetailQuery } from "@constants/queries/GetAxieDetailQuery"
import { MARKETPLACE_URL } from "@constants/url"
import { Axie, AxieClass } from "@custom-types/axie"
import { MarketplaceAPI } from "@services//api"
import { cache } from "@services//cache"
import logger from "pino-logger"

export interface APIAxieDetailsResponse {
	data: {
		axie: Axie
	}
}

export async function getAxieDetails(axieId: number): Promise<Axie | void> {
	const cacheKey = `axie:${axieId}`
	const cacheExpiration = 60 * 60 * 3 // 3 Hours
	const cacheEntry = await cache.get(cacheKey)

	if (cacheEntry) return { ...JSON.parse(cacheEntry), fromCache: true }

	return MarketplaceAPI.post<APIAxieDetailsResponse>("/", {
		query: GetAxieDetailQuery,
		variables: {
			axieId,
		},
	})
		.then(async ({ data }) => {
			const axieDetails = data.data.axie

			if (!axieDetails) return

			axieDetails.url = `${MARKETPLACE_URL}/marketplace/axies/${axieId}`

			axieDetails.class = axieDetails.class ? (axieDetails.class.toLowerCase() as AxieClass) : axieDetails.class

			await cache.set(`axieDetails:${axieId}`, JSON.stringify(axieDetails), "EX", cacheExpiration)

			return axieDetails
		})
		.catch((error) => logger.error(error, `MarketplaceAPI Error: getAxieDetails - ${axieId}`))
}
