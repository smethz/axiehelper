import { deleteGuild } from "@utils/dbFunctions"
import { Guild } from "discord.js"
import logger from "pino-logger"

export default async function (guild: Guild) {
	logger.info(`SERVER DELETED | NAME: ${guild.name} (${guild.id})`)

	if (!guild) return

	try {
		await deleteGuild(guild.id)
	} catch (error) {
		logger.error(error, "GuildDelete Error")
	}
}
