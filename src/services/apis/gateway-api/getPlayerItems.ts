import { DEFAULT_CACHE_EXPIRATION } from "@constants/index"
import { UserID } from "@custom-types/common"
import { PlayerItem } from "@custom-types/items"
import { GatewayAPI } from "@services/api"
import { cache } from "@services/cache"
import { isFulfilled } from "@utils/promiseHandler"
import { AxiosError } from "axios"
import pThrottle from "p-throttle"
import logger from "pino-logger"

const throttle = pThrottle({ limit: 10, interval: 1000 })

interface APIPlayerItemsResponse {
	_items: PlayerItem[]
	_metadata: Metadata
	_etag: string
}

interface Metadata {
	limit: number
	offset: number
	total: number
	hasNext: boolean
}

interface APIPlayerItemsParams {
	userID: UserID
	limit?: number
	offset?: number
	itemIDs?: string
}

export async function getPlayerItems({
	userID,
	limit = 100,
	offset = 0,
	itemIDs,
}: APIPlayerItemsParams): Promise<PlayerItem[]> {
	const cacheKey = `playerItems:${userID}`
	const cachedEntry = await cache.get(cacheKey)
	if (cachedEntry) return JSON.parse(cachedEntry)

	const request = throttle(async () => {
		const initialPlayerItems = await GatewayAPI.get<APIPlayerItemsResponse>("/origin/v2/community/users/items", {
			params: { userID, limit, offset, itemIDs },
		})
			.then(async (response) => response.data)
			.catch((error: AxiosError) => logger.error(error))

		if (!initialPlayerItems) return

		const metadata = initialPlayerItems._metadata
		let playerItems = initialPlayerItems._items

		if (metadata.hasNext) {
			const totalPages = Math.ceil(metadata.total / metadata.limit)
			let promisesArray = []

			for (let currentPage = 1; currentPage < totalPages; currentPage++) {
				promisesArray.push(
					GatewayAPI.get<APIPlayerItemsResponse>(`origin/v2/community/users/items`, {
						params: { userID, limit, offset: 1 + limit * currentPage },
					})
				)
			}

			const settledPromises = await Promise.allSettled(promisesArray)
			const moreItems = settledPromises.filter(isFulfilled).flatMap((promise) => promise.value.data._items)

			playerItems = [...new Set([...moreItems, ...playerItems])]
		}

		return playerItems
	})

	const data = await request()

	if (!data) throw new Error(`GatewayAPI Error: getPlayerItems - ${userID}`)

	await cache.set(cacheKey, JSON.stringify(data), "EX", DEFAULT_CACHE_EXPIRATION)

	return data
}
