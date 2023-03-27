import { getPlayerItems } from "@apis/gateway-api/getPlayerItems"
import { parseInventory } from "@utils/parsers"
import { isAPIError } from "./isAPIError"

export async function getPlayerCharmsAndRunes(userID: string) {
	const playerItems = await getPlayerItems({ userID })

	if (isAPIError(playerItems)) return playerItems

	return parseInventory(playerItems)
}
