import { Guild } from "discord.js"
import logger from "pino-logger"

export default async function (guild: Guild) {
	const guildOwner = await guild.fetchOwner({ cache: true })

	logger.info(
		`SERVER ADDED | NAME: ${guild.name} (${guild.id}) | OWNER: ${guildOwner.user.id} | MEMBERS: ${guild.memberCount}`
	)
}
