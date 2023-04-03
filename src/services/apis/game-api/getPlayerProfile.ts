import { DEFAULT_CACHE_EXPIRATION } from "@constants/index"
import { AXIES_IO_URL, MARKETPLACE_URL, RONINCHAIN_URL } from "@constants/url"
import { UserID } from "@custom-types/common"
import { ParsedPlayerIngameProfile } from "@custom-types/profile"
import { GameAPI } from "@services/api"
import { cache } from "@services/cache"
import { cleanPlayerName } from "@utils/cleanPlayerName"
import { updateProfileName } from "@utils/dbFunctions"
import { isAPIError } from "@utils/isAPIError"
import { parseAddress } from "@utils/parsers"
import { AxiosError } from "axios"
import logger from "pino-logger"

export async function getPlayerProfile(userId: UserID): Promise<ParsedPlayerIngameProfile | AxiosError | void> {
	const cacheKey = `profileDetails:${userId}`
	const cacheEntry = await cache.get(cacheKey)

	if (cacheEntry) return { ...JSON.parse(cacheEntry), source: "CACHE" }

	const playerProfile = await GameAPI.get<ParsedPlayerIngameProfile>(`/v2/users/${userId}/profiles`)
		.then(async (response) => response.data)
		.catch((error: AxiosError) => {
			logger.error(error, `GameAPI Error: ${error.response?.status} getPlayerProfile - ${userId}`)
			return error
		})

	if (isAPIError(playerProfile)) return playerProfile

	if (!playerProfile) return

	playerProfile.name = cleanPlayerName(playerProfile.name)

	playerProfile.roninAddress = parseAddress(playerProfile.roninAddress, "ronin")

	playerProfile.url = {
		axies_io: `${AXIES_IO_URL}/profile/${playerProfile.roninAddress}`,
		explorer: `${RONINCHAIN_URL}/address/${playerProfile.roninAddress}`,
		marketplace: `${MARKETPLACE_URL}/profile/${playerProfile.roninAddress}`,
	}

	await cache.set(cacheKey, JSON.stringify({ ...playerProfile, source: "API" }), "EX", DEFAULT_CACHE_EXPIRATION)
	await updateProfileName(userId, playerProfile.name)

	return playerProfile
}
