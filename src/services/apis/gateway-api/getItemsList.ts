import { GatewayAPI } from "@services/api"
import { cache } from "@services/cache"

import logger from "pino-logger"

export async function getItemsList(itemType: "charms" | "runes" | "cards"): Promise<Array<any> | void> {
	const cacheKey = `itemList:${itemType}`

	const itemList = await GatewayAPI.get(`/origin/v2/community/${itemType}`)
		.then(async (response) => response.data._items)
		.catch(async (error) => {
			logger.error(error)

			const cachedEntry = await cache.get(cacheKey)
			if (cachedEntry) return JSON.parse(cachedEntry)
		})

	if (!Array.isArray(itemList) || !itemList.length) return

	await cache.set(cacheKey, JSON.stringify(itemList))

	return itemList
}
