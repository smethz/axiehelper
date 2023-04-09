import { LAND_STAKING_POOL_CONTRACT_ADDRESS } from "@constants/contracts/addresses"
import land_props from "@constants/props/land-props.json"
import { AXIEINFINITY_CDN_URL, MARKETPLACE_URL } from "@constants/url"
import { ParsedLand } from "@custom-types/land"
import { parseAddress } from "./parseAddress"

export function parseLand(land: ParsedLand) {
	const props = land_props[land.landType as keyof typeof land_props]
	land.emoji = props.emoji
	land.color = props.color
	land.image = props.image

	land.url = `${MARKETPLACE_URL}/marketplace/lands/${land.col}/${land.row}`
	land.thumbnail_url = `${AXIEINFINITY_CDN_URL}/avatars/land/square/square_${land.col}_${land.row}.png`

	if (land.owner === LAND_STAKING_POOL_CONTRACT_ADDRESS) {
		land.ownerProfile = { name: "Land Staking Pool" }
	}

	land.owner = parseAddress(land.owner, "ronin")

	if (land.highestOffer?.maker) {
		land.highestOffer.maker = parseAddress(land.highestOffer.maker, "ronin")
	}

	return land
}
