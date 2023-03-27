import type { RedisOptions } from "ioredis"

const redisConfig: RedisOptions = {
	host: process.env.REDIS_HOST || "localhost",
	port: Number(process.env.REDIS_PORT) || 6379,
	password: process.env.REDIS_PASSWORD,
}

export default redisConfig
