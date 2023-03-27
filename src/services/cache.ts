import config from "@configs/redis"
import Redis from "ioredis"
import logger from "pino-logger"

export const cache = new Redis(config)

cache.on("connect", () => logger.info("Successfully connected to the cache server"))
cache.on("ready", () => logger.info("Cache service is now ready"))
cache.on("reconnecting", () => logger.info("Trying to reconnect to the cache server..."))
cache.on("error", (error) => logger.error(error, error.message))
