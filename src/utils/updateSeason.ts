import { getSeasons } from "@apis/game-api/getSeasons"

export async function updateSeason() {
	const originSeasons = await getSeasons()

	if (!originSeasons) throw new Error(`Failed to update to the latest season`)

	const seasonIds = originSeasons.map((season) => season.id ?? -Infinity)

	globalThis.CURRENT_SEASON_ID = Math.max(...seasonIds)
}
