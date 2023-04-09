import { GetLandDetailQuery } from "@constants/queries/GetLandDetailQuery"
import { Land, ParsedLand } from "@custom-types/land"
import { MarketplaceAPI } from "@services//api"
import { cache } from "@services/cache"
import { isAPIError } from "@utils/isAPIError"
import { parseLand } from "@utils/parsers/parseLand"
import { AxiosError } from "axios"
import logger from "pino-logger"

interface APILandDetailsResponse {
	data: Data
}

interface Data {
	land: Land
}

export async function getLandDetails(col: number, row: number): Promise<ParsedLand | AxiosError | void> {
	const cacheKey = `land:${col}_${row}`
	const cacheExpiration = 60 * 60 * 1 // 1 hour in seconds

	const cacheEntry = await cache.get(cacheKey)

	if (cacheEntry) return { ...JSON.parse(cacheEntry), fromCache: true }

	let landDetails = await MarketplaceAPI.post<APILandDetailsResponse>("/", {
		query: GetLandDetailQuery,
		variables: {
			col,
			row,
		},
	})
		.then((response) => response.data.data.land)
		.catch((error) => {
			logger.error(error, `MarketplaceAPI Error: getLandDetails - (${col}, ${row})`)
			return error
		})

	if (isAPIError(landDetails)) return landDetails

	if (!landDetails) return

	landDetails = parseLand(landDetails)

	await cache.set(cacheKey, JSON.stringify(landDetails), "EX", cacheExpiration)

	return landDetails
}
