import { RoninAddress, UserID } from "@custom-types/common"
import { RoninRestAPI } from "@services/api"
import { cache } from "@services/cache"
import logger from "pino-logger"

export interface APIResolvedProfileResponse {
	accountId: string
	ronin: string
	ethereum: string
	name: string
	homeland: string | null
}

export async function resolveProfile(
	clientId_or_roninAddress: RoninAddress | UserID
): Promise<APIResolvedProfileResponse | void> {
	const cacheKey = `id:${clientId_or_roninAddress.toLowerCase()}`
	const cachedExpiration = 60 * 60 * 24 // 1 Day
	const cachedData = await cache.get(cacheKey)
	if (cachedData) return JSON.parse(cachedData)

	return RoninRestAPI.get<APIResolvedProfileResponse>(`/sm/resolveProfile/${clientId_or_roninAddress}`)
		.then(async (response) => {
			const profile = response.data

			if (!profile.accountId || !profile.ronin) return

			profile.name = profile.name.replace(/\r?\n|\r/g, "").trim()
			profile.name = profile.name.replace(/(<#.{3,6}>)|(<color=#.{3,6}>)/g, "")

			await cache.set(cacheKey, JSON.stringify(profile), "EX", cachedExpiration)

			return profile
		})
		.catch((error) => logger.error(error, `RoninRest API Error: resolveProfile - ${clientId_or_roninAddress}`))
}
