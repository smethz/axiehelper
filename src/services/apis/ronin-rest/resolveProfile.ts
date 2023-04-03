import { RoninAddress, UserID } from "@custom-types/common"
import { RoninRestAPI } from "@services/api"
import { cache } from "@services/cache"
import { cleanPlayerName } from "@utils/cleanPlayerName"
import { AxiosError } from "axios"
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
): Promise<APIResolvedProfileResponse | AxiosError | void> {
	const cacheKey = `id:${clientId_or_roninAddress.toLowerCase()}`
	const cachedExpiration = 60 * 60 * 24 * 7 // 7 Days
	const cachedEntry = await cache.get(cacheKey)

	if (cachedEntry) return JSON.parse(cachedEntry)

	return RoninRestAPI.get<APIResolvedProfileResponse>(`/sm/resolveProfile/${clientId_or_roninAddress}`)
		.then(async (response) => {
			const profile = response.data

			if (!profile.accountId || !profile.ronin) return

			profile.name = cleanPlayerName(profile.name)

			await cache.set(cacheKey, JSON.stringify(profile), "EX", cachedExpiration)

			return profile
		})
		.catch((error: AxiosError) => {
			logger.error(error, `RoninRestAPI Error: ${error.response?.status} resolveProfile - ${clientId_or_roninAddress}`)

			return error
		})
}
