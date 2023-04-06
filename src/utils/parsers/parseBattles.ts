import { getPlayerProfile } from "@apis/game-api/getPlayerProfile"
import { ArenaBattle, ParsedArenaBattle, ParsedPlayerBattles, PlayerBattles } from "@custom-types/battle"
import { RoninAddress, UserID } from "@custom-types/common"
import { ParsedPlayerIngameProfile } from "@custom-types/profile"
import { AxieContract } from "@services/rpc"
import { parseAddress } from "@utils/parsers"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
dayjs.extend(utc)

export function parseArenaBattle(
	battle: ArenaBattle,
	userId: UserID,
	battleIndex: number,
	profile: ParsedPlayerIngameProfile | void
): ParsedArenaBattle {
	userId = userId.toLowerCase()

	const playerIndex = battle.client_ids.indexOf(userId)
	const playerTeam = playerIndex === 0 ? "first_client_fighters" : "second_client_fighters"
	const playerTeamFighters = battle[playerTeam]

	const playerRewards = battle.delta_rewards.find((reward) => reward.user_id === userId)

	const opponentIndex = playerIndex !== 1 ? 1 : 0
	const opponentTeam = playerTeam === "first_client_fighters" ? "second_client_fighters" : "first_client_fighters"
	const opponentTeamFighters = battle[opponentTeam]
	const opponentRewards = battle.delta_rewards.find((reward) => reward.user_id !== userId)

	// Determine the Result of the playerBattle
	// 0 is First Client
	// 1 is Second Client
	// 2 is Draw
	let result: "Victory" | "Defeated" | "Draw"
	let result_emoji: "🟢" | "🔴" | "⚪"

	if (playerIndex === battle.winner) {
		result = "Victory"
		result_emoji = "🟢"
	} else if (opponentIndex === battle.winner) {
		result = "Defeated"
		result_emoji = "🔴"
	} else {
		result = "Draw"
		result_emoji = "⚪"
	}

	const vstar_gained = playerRewards?.new_vstar ? playerRewards.new_vstar - playerRewards.old_vstar : 0

	const slp_gained = playerRewards?.items.find((item) => item.item_id == "slp")?.quantity

	const moonshard_gained = playerRewards?.items
		.filter((item) => item.item_id === "moonshard")
		.reduce((previousVal, currentVal) => previousVal + currentVal.quantity, 0)

	const player = {
		userId: battle.client_ids[playerIndex]!,
		profile,
		fighters: playerTeamFighters,
		rank: battle.user_ranks[playerIndex]!,
		rewards: {
			vstar_gained,
			slp_gained: slp_gained ?? 0,
			moonshard_gained: moonshard_gained ?? 0,
			new_vstar: playerRewards?.new_vstar,
			old_vstar: playerRewards?.old_vstar,
		},
	}

	const opponent = {
		userId: battle.client_ids[opponentIndex]!,
		fighters: opponentTeamFighters,
		rank: battle.user_ranks[opponentIndex]!,
		rewards: opponentRewards,
	}

	return {
		battleIndex,
		...battle,
		player,
		opponent,
		result,
		result_emoji,
	}
}

export async function parsePlayerBattles(playerBattles: PlayerBattles, userId: UserID): Promise<ParsedPlayerBattles> {
	const profile = await getPlayerProfile(userId)

	const battles = playerBattles.map((battle, index) =>
		parseArenaBattle(battle, userId, index, profile as ParsedPlayerIngameProfile)
	)

	const match_total = battles.length

	const win_total = countBattleResults("Victory", battles)
	const win_rate = +((win_total / match_total) * 100).toFixed(2)

	const draw_total = countBattleResults("Draw", battles)
	const draw_rate = +((draw_total / match_total) * 100).toFixed(2)

	const lose_total = countBattleResults("Defeated", battles)
	const lose_rate = +((lose_total / match_total) * 100).toFixed(2)

	const most_used_team_id = battles
		.flatMap((battle) => battle.team_ids)
		.reduce((accumulator, previousValue, _currentIndex, teamsArray) =>
			teamsArray.filter((v) => v === accumulator).length >= teamsArray.filter((v) => v === previousValue).length
				? accumulator
				: previousValue
		)

	const last_used_team = battles[0]!.player.fighters
	const most_used_team = battles.find((battle) => battle.team_ids.some((id) => id === most_used_team_id))!.player
		.fighters

	const parsedPlayerBattles = {
		battles,
		player: profile as ParsedPlayerIngameProfile,
		match_total,
		win_total,
		win_rate,
		draw_total,
		draw_rate,
		lose_total,
		lose_rate,
		last_used_team,
		most_used_team,
	}

	const playerStamina = await getCurrentStamina(parsedPlayerBattles)

	return { ...parsedPlayerBattles, ...playerStamina }
}

function countBattleResults(battleResult: "Victory" | "Defeated" | "Draw", battles: ParsedArenaBattle[]) {
	return battles.reduce(
		(previousVal, currentVal) => (currentVal.result == battleResult ? previousVal + 1 : previousVal),
		0
	)
}

async function calculateMaxStamina(
	roninAddress: RoninAddress
): Promise<{ maxStamina: number; numOfPersonalAxies: number }> {
	// roninAddress in 0x Format
	roninAddress = parseAddress(roninAddress)

	let numOfPersonalAxies = await AxieContract.balanceOf(roninAddress)
	numOfPersonalAxies = parseInt(numOfPersonalAxies)

	let maxStamina: number = 10

	if (numOfPersonalAxies >= 20) maxStamina += 20
	else maxStamina += numOfPersonalAxies ?? 0

	return { maxStamina, numOfPersonalAxies }
}

async function getCurrentStamina(playerBattle: ParsedPlayerBattles) {
	const { maxStamina, numOfPersonalAxies } = await calculateMaxStamina(playerBattle.player?.roninAddress!)

	const todayDate = dayjs.utc().startOf("day").toDate()

	const todayBattles = playerBattle.battles.filter((battle) => {
		const earlierToday = dayjs.utc(battle.ended_time * 1000).toDate()
		return earlierToday >= todayDate && battle.battle_type_string === "ranked_pvp"
	})

	const totalBattles = todayBattles.length

	if (!totalBattles) {
		return {
			currentStamina: maxStamina,
			maxStamina,
			numOfPersonalAxies,
		}
	}

	return {
		currentStamina: maxStamina - totalBattles > 0 ? maxStamina - totalBattles : 0,
		maxStamina,
		numOfPersonalAxies,
	}
}
