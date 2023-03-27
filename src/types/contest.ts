export interface Contest {
	id: number
	name: string
	image_url: string
	mobile_image_url: string
	game_image_url: string
	thumbnail_url: string
	mobile_thumbnail_url: string
	short_description: string
	long_description: string
	preview_time: number
	start_time: number
	end_time: number
	closed_time: number
	state: string
	event_url: string
	enable_user_whitelist: boolean
	disable_leaderboard: boolean
	missions?: any
	milestones?: any
	rewards?: any
	created_at: number
	updated_at: number
	created_by?: any
	updated_by?: string
	delivered_reward_at?: number
	white_user_id?: string
}

export interface ContestPlayer {
	user_id: string
	user_name: string
	total_point: number
	rank: number
}
