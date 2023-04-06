import { createErrorEmbed } from "@client/components/embeds"
import { createPaginationButtons, getFooter, getPageIndex } from "@client/components/pagination"
import { createSelectionMenu, MAX_OPTIONS_IN_SELECT_MENU } from "@client/components/selection"
import { DEFAULT_IDLE_TIME } from "@constants/index"
import emojis from "@constants/props/emojis.json"
import { AXIEHELPER_DOCS_URL } from "@constants/url"
import { AutoCompleteParams, CommandCategory, CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { componentFilter } from "@utils/componentFilter"
import { disableComponents } from "@utils/componentsToggler"
import {
	ApplicationCommandOptionType,
	Collection,
	ComponentType,
	EmbedBuilder,
	PermissionsBitField,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js"
import Fuse from "fuse.js"

const config: RESTPostAPIChatInputApplicationCommandsJSONBody = {
	name: "help",
	description: "Shows the list of all available commands",
	options: [
		{
			name: "command",
			description: "Shows detailed information of the command",
			type: ApplicationCommandOptionType.String,
			autocomplete: true,
			required: false,
		},
	],
}

const command: SlashCommand = {
	config,
	userPermissions: [],
	botPermissions: [PermissionsBitField.Flags.ReadMessageHistory],
	guildOnly: false,
	ownerOnly: false,
	category: "Misc",
	execute,
	autocomplete,
}

async function execute({ interaction, client, translate }: CommandExecuteParams): Promise<void> {
	await interaction.deferReply()

	const command = interaction.options.getString("command")

	// Show Specific Command
	if (command) {
		const slashCommand = client.slashCommands.get(command)

		if (!slashCommand) {
			const unknownCommandEmbed = createErrorEmbed({
				title: translate("errors.unknown_command.title"),
				description: translate("errors.unknown_command.description"),
			})

			interaction.editReply({ embeds: [unknownCommandEmbed] }).catch(() => {})
			return
		}

		const commandCategory = slashCommand.category?.toLowerCase()
		const commandName = slashCommand.config.name.replace(" ", "-").toLowerCase()
		const commandURL = `${AXIEHELPER_DOCS_URL}/commands/${commandCategory}-commands/${commandName}`

		const embed = new EmbedBuilder()
			.setTitle(`${translate("name", { ns: slashCommand.config.name })}`)
			.setURL(commandURL)
			.setDescription(
				`**${translate("info")}**\n${translate("description", {
					ns: slashCommand.config.name,
				})}`
			)
			.setColor("Blurple")

		interaction.editReply({ embeds: [embed] }).catch(() => {})
		return
	}

	// Show All Commands
	let pageIndex = 0
	let pages = getCategoryCommands("All", client.slashCommands)
	let paginationButtons = createPaginationButtons({ pageIndex, maxPage: pages.length })

	const categoryMenuOptions = [
		{
			label: translate("labels.all"),
			value: "All",
			default: true,
		},
		{
			label: translate("labels.account"),
			value: "Account",
		},
		{
			label: translate("labels.axie"),
			value: "Axie",
		},
		{
			label: translate("labels.crypto"),
			value: "Crypto",
		},
		{
			label: translate("labels.fun"),
			value: "Fun",
		},
		{
			label: translate("labels.info"),
			value: "Info",
		},
		{
			label: translate("labels.misc"),
			value: "Misc",
		},
		{
			label: translate("labels.mod"),
			value: "Mod",
		},
	]

	const categoryMenuSelector = createSelectionMenu(categoryMenuOptions)

	const commandEmbed = new EmbedBuilder()
		.setDescription(pages[pageIndex] as string)
		.setFooter({ text: getFooter(pageIndex, pages, interaction.locale) })
		.setColor("Random")

	const message = await interaction.editReply({
		embeds: [commandEmbed],
		components: [paginationButtons, categoryMenuSelector],
	})

	const collector = message.createMessageComponentCollector<ComponentType.StringSelect | ComponentType.Button>({
		idle: DEFAULT_IDLE_TIME,
		filter: componentFilter(interaction),
	})

	collector.on("collect", async (componentInteraction) => {
		await componentInteraction.deferUpdate()

		if (componentInteraction.isButton()) {
			pageIndex = await getPageIndex(componentInteraction, pageIndex, pages.length)

			commandEmbed
				.setDescription(pages[pageIndex] as string)
				.setFooter({ text: getFooter(pageIndex, pages, interaction.locale) })
			commandEmbed.setColor("Random")

			paginationButtons = createPaginationButtons({ pageIndex, maxPage: pages.length })

			await componentInteraction
				.editReply({
					embeds: [commandEmbed],
					components: [paginationButtons, categoryMenuSelector],
				})
				.catch(() => {})
		}

		if (componentInteraction.isStringSelectMenu()) {
			pageIndex = 0
			pages = getCategoryCommands((componentInteraction.values[0] as CommandCategory) || "All", client.slashCommands)

			categoryMenuSelector.components[0]?.options.filter((option) => option.data.default === true)[0]?.setDefault(false)

			categoryMenuSelector.components[0]?.options
				.filter((option) => option.data.value === componentInteraction.values[0])[0]
				?.setDefault(true)

			commandEmbed.setDescription(pages[pageIndex] as string)
			commandEmbed.setFooter({
				text: getFooter(pageIndex, pages, interaction.locale),
			})

			paginationButtons = createPaginationButtons({ pageIndex, maxPage: pages.length })

			await componentInteraction
				.editReply({
					embeds: [commandEmbed],
					components: [paginationButtons, categoryMenuSelector],
				})
				.catch(() => {})
		}
	})

	collector.on("end", () => {
		disableComponents(paginationButtons, categoryMenuSelector)

		message.edit({ components: [paginationButtons, categoryMenuSelector] }).catch(() => {})
	})

	function getCategoryCommands(
		category: CommandCategory | "All",
		slashCommands: Collection<string, SlashCommand>
	): string[] {
		let commandsInCategory = []

		if (category === "All") {
			commandsInCategory = slashCommands.map((command) => command).filter((command) => command.category !== "Owner")
		} else {
			commandsInCategory = slashCommands.filter((command) => command.category === category).map((command) => command)
		}

		let commandList = ""

		for (const command of commandsInCategory) {
			const commandCategory = command.category?.toLowerCase()
			const commandName = command.config.name.replace(" ", "-").toLowerCase()
			const commandURL = `${AXIEHELPER_DOCS_URL}/commands/${commandCategory}-commands/${commandName}`

			commandList += `[${translate("name", {
				ns: command.config.name,
			})}](${commandURL})\n`
			commandList += `${emojis.reply} ${translate("description", {
				ns: command.config.name,
			})}\n`
		}

		const LINEBREAK_REGEX = /(?=[\s\S])(?:.*\n?){1,20}/g
		return commandList.match(LINEBREAK_REGEX) as string[]
	}
}

async function autocomplete({ interaction, client, translate }: AutoCompleteParams) {
	const focusedValue = interaction.options.getFocused()

	const commandsList = client.slashCommands.map((command) => {
		return {
			name: translate("name", { ns: command.config.name }),
			value: command.config.name,
		}
	})

	if (!focusedValue) {
		return interaction.respond(commandsList.slice(0, MAX_OPTIONS_IN_SELECT_MENU))
	}

	const options = {
		threshold: 0.4,
		minMatchCharLength: focusedValue.length,
		keys: ["name"],
	}

	const fuse = new Fuse(commandsList, options)
	const searchResult = fuse.search(focusedValue)

	if (searchResult.length > MAX_OPTIONS_IN_SELECT_MENU) searchResult.length = MAX_OPTIONS_IN_SELECT_MENU

	await interaction.respond(
		searchResult.map((choice) => ({
			name: choice.item.name,
			value: choice.item.name,
		}))
	)
}

export default command
