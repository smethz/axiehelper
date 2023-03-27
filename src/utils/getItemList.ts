import { ParsedCard } from "@custom-types/card"
import { ParsedCharm } from "@custom-types/charm"
import { Part } from "@custom-types/parts"
import { ParsedRune } from "@custom-types/rune"
import { readJsonSync } from "fs-extra"
import path from "path"

export function getCardsList(): ParsedCard[] {
	return readJsonSync(path.join(__dirname, "../constants/props/cards.json"), "utf-8")
}

export function getRunesList(): ParsedRune[] {
	const list = readJsonSync(path.join(__dirname, "../constants/props/runes.json"), "utf-8")
	return list.filter((rune: ParsedRune) => rune.item.id.endsWith("_nft"))
}

export function getCharmsList(): ParsedCharm[] {
	const list = readJsonSync(path.join(__dirname, "../constants/props/charms.json"), "utf-8")
	return list.filter((charm: ParsedCharm) => charm.item.id.endsWith("_nft"))
}

export function getBodyparts(): Part[] {
	const bodyParts = readJsonSync(path.join(__dirname, "../constants/props/body-parts.json"), "utf-8")
	return Object.values(bodyParts)
}
