import { CURRENT_SEASON_ID, NUM_OF_MAX_LEADERBOARD_PLAYERS, NUM_OF_MAX_SAVED_PROFILES } from "@configs/config.json"

export const DEFAULT_CACHE_EXPIRATION = 60 * 30 // 30 minutes in seconds
export const DEFAULT_IDLE_TIME = 1000 * 60 * 10 // 10 minutes in milliseconds

export const isDevelopment = process.env.NODE_ENV === "development"
export const isProduction = process.env.NODE_ENV === "production"

export const LOCALES_PATH = "./locales"

export const LATEST_SEASON_ID = CURRENT_SEASON_ID

export const MAX_SAVED_PROFILES = NUM_OF_MAX_SAVED_PROFILES

export const MAX_LEADERBOARD_PLAYERS = NUM_OF_MAX_LEADERBOARD_PLAYERS

export const SPECIAL_CHAR_REGEX = /[&\/\\#,+$~%"\[\]*?<>{}]/g
