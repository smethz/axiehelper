import "dotenv/config"
import "module-alias/register"

import { CLIENT_ID, DEV_CLIENT_ID, GUILD_ID } from "@configs/config.json"
import { REST, Routes } from "discord.js"

import logger from "pino-logger"
import Client from "./client"
import { isDevelopment } from "./constants"

const client = new Client()

client.loadCommands()

const clientToken = isDevelopment ? process.env.DEV_CLIENT_TOKEN : process.env.CLIENT_TOKEN

const globalCommands = client.slashCommands
	.filter((command) => command.category !== "Owner")
	.map((command) => command.config)

const ownerCommands = client.slashCommands
	.filter((command) => command.ownerOnly && command.category === "Owner")
	.map((command) => command.config)

const clientCommands = [...globalCommands, ...ownerCommands]

const rest = new REST({ version: "10" }).setToken(clientToken!)

;(async () => {
	try {
		logger.info(`Started refreshing ${clientCommands.length} application (/) commands.`)

		if (isDevelopment) {
			await rest
				.put(Routes.applicationGuildCommands(DEV_CLIENT_ID, GUILD_ID), {
					body: clientCommands,
				})
				.then((data: any) => {
					logger.info(`Successfully reloaded ${data.length} developer application (/) commands.`)
				})
		} else {
			await rest.put(Routes.applicationCommands(CLIENT_ID), { body: globalCommands }).then((data: any) => {
				logger.info(`Successfully reloaded ${data.length} global application (/) commands.`)
			})

			await rest
				.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
					body: ownerCommands,
				})
				.then((data: any) => {
					logger.info(`Successfully reloaded ${data.length} developer application (/) commands.`)
				})
		}

		process.exit()
	} catch (error) {
		logger.error(error)
	}
})()
