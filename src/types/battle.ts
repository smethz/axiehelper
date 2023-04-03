import { UserID } from "./common"
import { ParsedPlayerIngameProfile, PlayerIngameProfile, Ranks } from "./profile"

export type PlayerBattles = ArenaBattle[]

export interface ArenaBattle {
	battle_uuid: string
	client_ids: [UserID, UserID]
	team_ids: [number, number]
	created_at: number
	winner: 0 | 1 | 2
	battle_type: number
	battle_type_string: "pvp" | "ranked_pvp" | "practice_pvb" | "practice_pvp" | "blitz_pvp"
	first_client_fighters: [Fighter, Fighter, Fighter]
	second_client_fighters: [Fighter, Fighter, Fighter]
	rewards: [Reward, Reward] | []
	delta_rewards: [Reward, Reward] | []
	user_ranks: [Ranks, Ranks]
	started_time: number
	ended_time: number
	old_mmr: number
	new_mmr: number
}

export interface Fighter {
	gene: string
	axie_id: number
	axie_type: "starter" | "ronin"
	runes: string[] | []
	charms: {
		eyes: string
		mouth: string
		ears: string
		horn: string
		back: string
		tail: string
	}
}

export interface Reward {
	user_id: string
	new_vstar: number
	old_vstar: number
	result: "lose" | "win" | "draw"
	items: ItemReward[] | []
}

export interface ItemReward {
	item_id: "exp" | "moonshard" | "slp"
	quantity: number
}

export interface ParsedArenaBattle extends ArenaBattle {
	player: {
		userId: UserID
		profile?: ParsedPlayerIngameProfile | void
		fighters: [Fighter, Fighter, Fighter]
		rank: Ranks
		rewards:
			| {
					slp_gained: number
					moonshard_gained: number
					vstar_gained: number
					new_vstar: number | undefined
					old_vstar: number | undefined
			  }
			| undefined
	}
	opponent: {
		userId: UserID
		profile?: PlayerIngameProfile | void
		fighters: [Fighter, Fighter, Fighter]
		rank: Ranks
		rewards: Reward | undefined
	}
	battleIndex: number
	result: "Victory" | "Defeated" | "Draw"
	rps_winner?: string
	result_emoji: "🟢" | "🔴" | "⚪"
}

export interface ParsedPlayerBattles {
	battles: ParsedArenaBattle[] | []
	player?: ParsedPlayerIngameProfile | void
	currentStamina?: number
	maxStamina?: number
	numOfPersonalAxies?: number
	match_total: number
	win_total: number
	win_rate: number
	lose_total: number
	lose_rate: number
	draw_total: number
	draw_rate: number
	last_used_team: [Fighter, Fighter, Fighter]
	most_used_team: [Fighter, Fighter, Fighter]
}
