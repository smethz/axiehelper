import { GetPublicProfileWithRoninAddress } from "@constants/queries"
import { RoninAddress } from "@custom-types/common"
import { MarketplaceAPI } from "@services/api"
import { cache } from "@services/cache"
import { parseAddress } from "@utils/parsers"
import logger from "pino-logger"

interface APIPublicProfileWithRoninAddress {
	publicProfileWithRoninAddress: {
		accountId: string
	}
}

export async function getPublicProfileWithRoninAddress(
	roninAddress: RoninAddress
): Promise<{ roninAddress: string; accountId: string } | void> {
	roninAddress = roninAddress.toLowerCase()
	roninAddress = parseAddress(roninAddress, "ethereum")

	const cacheKey = `id:${roninAddress}`
	const cachedEntry = await cache.get(cacheKey)

	if (cachedEntry) return JSON.parse(cachedEntry)

	const accountId = await MarketplaceAPI.post<APIPublicProfileWithRoninAddress>("", {
		query: GetPublicProfileWithRoninAddress,
		variables: {
			roninAddress: roninAddress,
		},
	})
		.then((response) => {
			return response.data?.publicProfileWithRoninAddress?.accountId
		})
		.catch((error) => logger.error(error, `MarketplaceAPI Error: getPublicProfileWithRoninAddress`))

	if (!accountId) return

	const publicProfile = {
		roninAddress,
		accountId,
	}

	await cache.set(cacheKey, JSON.stringify(publicProfile))

	return publicProfile
}
