import { DEFAULT_CACHE_EXPIRATION } from "@constants/index"
import { BATTLES_API } from "@constants/url"
import { ArenaBattle, ParsedPlayerBattles } from "@custom-types/battle"
import { UserID } from "@custom-types/common"
import { GameAPI } from "@services/api"
import { cache } from "@services/cache"
import { isAPIError } from "@utils/isAPIError"
import { parsePlayerBattles } from "@utils/parsers"
import { AxiosError } from "axios"
import logger from "pino-logger"

interface APIBattlesResponse {
	battles: ArenaBattle[] | []
}

interface APIBattlesParams {
	limit?: number
	page?: number
	type?: "pve" | "pvp"
}

export async function getPlayerBattles(
	userId: UserID,
	options: APIBattlesParams = { limit: 100, page: 1, type: "pvp" }
): Promise<ParsedPlayerBattles | AxiosError | void> {
	const cacheKey = `playerBattles:${userId}`
	const cacheEntry = await cache.get(cacheKey)

	if (cacheEntry) return JSON.parse(cacheEntry)

	const playerBattles = await GameAPI.get<APIBattlesResponse>(`/origin/battle-history`, {
		baseURL: BATTLES_API,
		params: {
			limit: options.limit,
			page: options.page,
			type: options.type,
			client_id: userId,
		},
	})
		.then((response) => response.data.battles)
		.catch((error: AxiosError) => {
			logger.error(error, `GameAPI Error: ${error.response?.status} getPlayerBattles - ${userId}`)
			return error
		})

	if (isAPIError(playerBattles)) return

	if (!playerBattles.length) return

	const parsedPlayerBattles = await parsePlayerBattles(playerBattles, userId)

	await cache.set(cacheKey, JSON.stringify(parsedPlayerBattles), "EX", DEFAULT_CACHE_EXPIRATION)

	return parsedPlayerBattles
}
