import { RoninAddress, UserID } from "@custom-types/common"
import { utils } from "ethers"

const USER_ID_LENGTH = 36
export const VALID_UUID_REGEX = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i

export function isValidClientID(userId: UserID): boolean {
	return VALID_UUID_REGEX.test(userId)
}

export function isValidRoninAddress(address: RoninAddress): boolean {
	if (address.startsWith("ronin:")) address = address.slice("ronin:".length)

	return utils.isAddress(address)
}

export function determineAddress(id: UserID | RoninAddress): "userId" | "roninAddress" | void {
	if (id.length == USER_ID_LENGTH) {
		if (isValidClientID(id)) return "userId"
	}

	if (id.startsWith("ronin")) id = id.slice("ronin:".length)
	if (utils.isAddress(id)) return "roninAddress"

	return
}
