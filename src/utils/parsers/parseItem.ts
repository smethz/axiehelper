import { SPECIAL_CHAR_REGEX } from "@constants/index"
import classProperties from "@constants/props/axie-class-props.json"
import emojis from "@constants/props/emojis.json"
import { MARKETPLACE_URL } from "@constants/url"
import { ParsedCard } from "@custom-types/card"
import { ParsedCharm } from "@custom-types/charm"
import { ParsedRune } from "@custom-types/rune"

export function parseItem(token: ParsedCharm | ParsedRune) {
	const isCharm = (item: ParsedCharm | ParsedRune): item is ParsedCharm => !!(item as ParsedCharm).potentialPoint

	token.item.description = token.item.description.replace(SPECIAL_CHAR_REGEX, "")
	token.color = classProperties[token.class.toLowerCase() as keyof typeof classProperties].color
	token.classEmoji = classProperties[token.class.toLowerCase() as keyof typeof classProperties].emoji
	token.rarityEmoji = emojis.rarity[token.item.rarity.toLowerCase() as keyof typeof emojis.rarity]
	token.listingUrl = `${MARKETPLACE_URL}/marketplace/${isCharm(token) ? "charms" : "runes"}/${
		token.item.tokenId ?? token.item.displayOrder
	}/all-listing/`

	return token
}

export function parseCard(card: ParsedCard) {
	card.color = classProperties[card.partClass.toLowerCase() as keyof typeof classProperties].color
	card.emoji = classProperties[card.partClass.toLowerCase() as keyof typeof classProperties].emoji

	return card
}
