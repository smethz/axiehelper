import { DEFAULT_CACHE_EXPIRATION } from "@constants/index"
import { AXIES_IO_URL, MARKETPLACE_URL, RONINCHAIN_URL } from "@constants/url"
import { UserID } from "@custom-types/common"
import { ParsedPlayerIngameProfile } from "@custom-types/profile"
import { GameAPI } from "@services/api"
import { cache } from "@services/cache"
import { updateProfileName } from "@utils/dbFunctions"
import { parseAddress } from "@utils/parsers"
import logger from "pino-logger"

export async function getPlayerProfile(userId: UserID): Promise<ParsedPlayerIngameProfile> {
	const cacheKey = `profileDetails:${userId}`

	const cacheEntry = await cache.get(cacheKey)
	if (cacheEntry) return { ...JSON.parse(cacheEntry), source: "CACHE" }

	const playerProfile = await GameAPI.get<ParsedPlayerIngameProfile>(`/v2/users/${userId}/profiles`)
		.then(async (response) => response.data)
		.catch((error) => logger.error(error))

	if (!playerProfile) throw new Error(`GameAPI Error: getPlayerProfile - ${userId}`)

	playerProfile.name = playerProfile.name.replaceAll(/\r?\n|\r/g, "").trim()
	playerProfile.name = playerProfile.name.replaceAll(/(<#.{3,6}>)|(<color=#.{3,6}>)/g, "")

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
