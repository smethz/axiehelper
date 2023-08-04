import { RoninAddress } from "@custom-types/common"
import { isAPIError } from "@utils/isAPIError"
import { resolveProfile } from "@utils/resolveProfile"

const USER_ID_CHAR_LENGTH = 36 // The number of characters in a User ID
const ETH_ID_CHAR_LENGTH = 40 // The number of characters in a ETH Address without "0x" prefix

/**
 * Formats the user id or the ronin address
 * Returns a formatted ronin address or ethereum address
 * @param {string} id Ronin Address or User ID
 * @param {('ronin' | 'ethereum')} [format='ethereum'] `ronin` | `ethereum` - defaults to `ethereum`
 * @return {string}  Returns the parsed address
 **/
export async function parseId(id: string, format: "ronin" | "ethereum" = "ethereum"): Promise<string> {
	if (id.length === USER_ID_CHAR_LENGTH) {
		const playerIdentifier = await resolveProfile(id)
		if (playerIdentifier && !isAPIError(playerIdentifier)) id = playerIdentifier.roninAddress
	}

	return parseAddress(id, format)
}

export function parseAddress(address: RoninAddress, format: "ronin" | "ethereum" = "ethereum"): string {
	address = address.toLowerCase()

	if (address.length === ETH_ID_CHAR_LENGTH) address = "0x" + address

	if (address.startsWith("ronin:")) address = address.replace("ronin:", "0x")

	if (format === "ronin") return address.replace("0x", "ronin:")

	return address
}
