import { cache } from "@services/cache"
import { VALID_UUID_REGEX } from "@utils/validateAddress"
import axios, { AxiosError } from "axios"
import logger from "pino-logger"

export async function getBattleReplay(replayId: string): Promise<string | void> {
	const cacheKey = `battle_replay:${replayId}`
	const cachedEntry = await cache.get(cacheKey)

	if (cachedEntry) return cachedEntry

	const replay = await axios
		.get<string>(`https://storage.googleapis.com/sm-prod-origin-battle-replay/pvp_battle_replay/${replayId}`)
		.then((response) => response.data)
		.catch((error: AxiosError) => {
			logger.error(error, `Failed to retrieve battle replay - ${replayId}`)
		})

	if (!replay) return

	const rpsWinner = replay.match(VALID_UUID_REGEX)

	if (!rpsWinner) return

	await cache.set(cacheKey, rpsWinner[0])

	return rpsWinner[0]
}
