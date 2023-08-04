import { GetAxieDetailQuery } from "@constants/queries"
import { MARKETPLACE_URL } from "@constants/url"
import { Axie, AxieClass } from "@custom-types/axie"
import { MarketplaceAPI } from "@services//api"
import { cache } from "@services//cache"
import { isAPIError } from "@utils/isAPIError"
import { AxiosError } from "axios"
import logger from "pino-logger"

export interface APIAxieDetailsResponse {
	data: {
		axie: Axie
	}
}

export async function getAxieDetails(axieId: number): Promise<Axie | AxiosError | void> {
	const cacheKey = `axie:${axieId}`
	const cacheExpiration = 60 * 60 * 3 // 3 hours in seconds

	const cacheEntry = await cache.get(cacheKey)

	if (cacheEntry) return { ...JSON.parse(cacheEntry), fromCache: true }

	const axieDetails = await MarketplaceAPI.post<APIAxieDetailsResponse>("", {
		query: GetAxieDetailQuery,
		variables: {
			axieId,
		},
	})
		.then(({ data }) => data.data.axie)
		.catch((error) => {
			logger.error(error, `MarketplaceAPI Error: getAxieDetails - ${axieId}`)
			return error
		})

	if (isAPIError(axieDetails)) return axieDetails

	if (!axieDetails) return

	axieDetails.url = `${MARKETPLACE_URL}/marketplace/axies/${axieId}`

	axieDetails.class = axieDetails.class ? (axieDetails.class.toLowerCase() as AxieClass) : axieDetails.class

	await cache.set(`axieDetails:${axieId}`, JSON.stringify(axieDetails), "EX", cacheExpiration)

	return axieDetails
}
