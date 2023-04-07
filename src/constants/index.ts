export const DEFAULT_CACHE_EXPIRATION = 60 * 30 // 30 minutes in seconds
export const DEFAULT_IDLE_TIME = 1000 * 60 * 10 // 10 minutes in milliseconds

export const isDevelopment = process.env.NODE_ENV === "development"
export const isProduction = process.env.NODE_ENV === "production"

export const LOCALES_PATH = "./locales"

export const MAX_SAVED_PROFILES = parseInt(process.env.MAX_SAVED_PROFILES || "50")

export const MAX_LEADERBOARD_PLAYERS = parseInt(process.env.MAX_LEADERBOARD_PLAYERS || "1000")

export const CLIENT_INVITE_URL = process.env.CLIENT_INVITE_URL || ""

export const GUILD_INVITE_URL = process.env.GUILD_INVITE_URL || ""

export const OWNER_IDS = process.env.OWNER_IDS?.replace(/\s+/g, "").split(",") || []

export const DEV_CLIENT_ID = process.env.DEV_CLIENT_ID || ""

export const CLIENT_ID = process.env.CLIENT_ID || ""

export const GUILD_ID = process.env.GUILD_ID || ""

export const SPECIAL_CHAR_REGEX = /[&\/\\#,+$~%"\[\]*?<>{}]/g
