import { getPlayerProfile } from "@apis/game-api/getPlayerProfile"
import { getPublicProfileWithRoninAddress } from "@apis/marketplace-api/getPublicProfileWithRoninAddress"
import { RoninAddress, UserID } from "@custom-types/common"
import { cache } from "@services/cache"
import { isAPIError } from "./isAPIError"
import { isValidClientID, isValidRoninAddress } from "./validateAddress"

export async function resolveProfile(
	clientId_or_roninAddress: RoninAddress | UserID
): Promise<{ roninAddress: string; accountId: string } | void> {
	clientId_or_roninAddress = clientId_or_roninAddress.toLowerCase()

	const cacheKey = `id:${clientId_or_roninAddress}`
	const cachedEntry = await cache.get(cacheKey)

	if (cachedEntry) return JSON.parse(cachedEntry)

	let resolvedProfile

	// Identify if given string is ClientID or RoninAddress
	if (isValidRoninAddress(clientId_or_roninAddress)) {
		resolvedProfile = await getPublicProfileWithRoninAddress(clientId_or_roninAddress)

		if (!resolvedProfile) return
	}

	if (isValidClientID(clientId_or_roninAddress)) {
		const profileCacheKey = `resolvedClientId:${clientId_or_roninAddress}`
		const profileCachedEntry = await cache.get(profileCacheKey)

		if (profileCachedEntry) {
			resolvedProfile = JSON.parse(profileCachedEntry)
		} else {
			const playerProfile = await getPlayerProfile(clientId_or_roninAddress)

			if (!playerProfile || isAPIError(playerProfile)) return

			resolvedProfile = {
				roninAddress: playerProfile.roninAddress,
				accountId: clientId_or_roninAddress,
			}

			await cache.set(profileCacheKey, JSON.stringify(resolvedProfile))
		}
	}

	await cache.set(cacheKey, JSON.stringify(resolvedProfile))

	return resolvedProfile
}
