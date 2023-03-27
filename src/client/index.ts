import { CommandOption, SlashCommand } from "@custom-types/command"
import { APIApplicationCommandOption, Client, Collection, LocaleString } from "discord.js"
import { existsSync, readdirSync, statSync } from "node:fs"
import { join, resolve, sep } from "node:path"

import clientConfig from "@configs/discord"
import { isProduction, LOCALES_PATH } from "@constants/index"
import type { CommandCategory } from "@custom-types/command"
import logger from "pino-logger"

const localizationErrors: {
	command: string
	type: "name" | "option"
	locale: LocaleString
	string: string
}[] = []

const VALID_NAME_REGEX = /^[-_\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]{1,32}$/u

export default class AxieHelperClient extends Client {
	constructor() {
		super(clientConfig)
	}

	public slashCommands: Collection<string, SlashCommand> = new Collection()
	public hangmanChannels: Collection<string, string> = new Collection()

	public async init() {
		this.loadCommands()

		this.loadEvents()

		this.login(isProduction ? process.env.CLIENT_TOKEN : process.env.DEV_CLIENT_TOKEN)
	}

	public loadCommands(commandsPath: string = "./dist/client/commands") {
		try {
			const commandFiles = findCommands(commandsPath, ".js")

			for (const file of commandFiles) {
				const command: SlashCommand = require(file).default
				// Load Command Localizations
				this.loadLocalizations(command)

				command.category = file.split(sep).at(-2)! as CommandCategory
				this.slashCommands.set(command.config.name, command)
				logger.info(`Loaded /${command.config.name} command`)
			}

			if (localizationErrors.length) {
				logger.error(`There were ${localizationErrors.length} localization errors:\n`, ...localizationErrors)
			}
		} catch (error) {
			logger.error(error, "LOAD COMMANDS: Error")
		}
	}

	private loadLocalizations(command: SlashCommand) {
		const locales = readdirSync(LOCALES_PATH) as LocaleString[]

		command.config.name_localizations ??= {}
		command.config.description_localizations ??= {}

		for (const locale of locales) {
			if (locale === "en-US") continue

			if (!existsSync(`${LOCALES_PATH}/${locale}/${command.config.name}.json`)) continue

			try {
				const commandLocalizationJson = require(`../../locales/${locale}/${command.config.name}.json`)

				if (
					["Owner"].includes(command.category) ||
					["name", "description", "options"].some((key) => !commandLocalizationJson[key as keyof SlashCommand])
				)
					continue

				if (!VALID_NAME_REGEX.test(commandLocalizationJson[command.config.name])) {
					localizationErrors.push({
						command: command.config.name,
						type: "name",
						locale,
						string: commandLocalizationJson[command.config.name],
					})
					continue
				}

				command.config.name_localizations[locale] = commandLocalizationJson.name
				command.config.description_localizations[locale] = commandLocalizationJson.description

				for (const option of command.config.options ?? []) {
					const optionJsonKey = Object.keys(commandLocalizationJson.options).find((key) => key === option.name)
					assignLocalisation(option, optionJsonKey, commandLocalizationJson.options[option.name], locale)
				}
			} catch (error) {
				logger.error(error, `Failed to load command localization for ${locale} for command ${command.config.name}:`)
				continue
			}
		}
	}

	private loadEvents() {
		const eventsPath = join(__dirname, "events")
		const eventFiles = readdirSync(eventsPath).filter((file) => file.endsWith(".js"))

		for (const file of eventFiles) {
			const filePath = join(eventsPath, file)
			const event = require(filePath).default
			const eventName = file.split(".")[0] as string

			this.on(eventName, (...args) => event(...args, this))
			logger.info(`EVENT: Loaded ${eventName}`)
		}
	}
}

export function findCommands(commandPath: string, commandExtension: string) {
	let commandFiles: string[] = []

	readdirSync(commandPath).forEach((innerPath) => {
		innerPath = resolve(commandPath, innerPath)
		const stat = statSync(innerPath)

		if (stat.isDirectory()) commandFiles = commandFiles.concat(findCommands(innerPath, commandExtension))
		else if (stat.isFile() && innerPath.endsWith(commandExtension)) commandFiles.push(innerPath)
	})

	return commandFiles
}

function assignLocalisation(
	option: APIApplicationCommandOption,
	optionJsonKey: string | undefined,
	optionJson: CommandOption | undefined,
	locale: LocaleString
) {
	if (!optionJson || !optionJson.name || !optionJson.description) return
	if (!optionJsonKey) return

	option.name_localizations ??= {}
	option.description_localizations ??= {}

	if (!VALID_NAME_REGEX.test(option.name) || option.name !== optionJsonKey) {
		localizationErrors.push({
			command: option.name,
			type: "option",
			locale,
			string: optionJson.name,
		})
		return
	}

	option.name_localizations[locale] = optionJson.name
	option.description_localizations[locale] = optionJson.description

	if ("choices" in option) {
		if (!optionJson.choices) return

		for (const choice of option.choices ?? []) {
			if (!optionJson.choices[choice.value]) continue

			choice.name_localizations ??= {}
			choice.name_localizations[locale] = optionJson.choices[choice.value]
		}
	}

	if ("options" in option) {
		for (const subOption of option.options ?? []) {
			const subOptionJsonKey = Object.keys(optionJson.options as object).find((key) => key === subOption.name)

			assignLocalisation(subOption, subOptionJsonKey, optionJson.options![subOption.name], locale)
		}
	}
}
