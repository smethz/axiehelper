import { createErrorEmbed } from "@client/components/embeds"
import { MAX_OPTIONS_IN_SELECT_MENU } from "@client/components/selection"
import { DEFAULT_IDLE_TIME } from "@constants/index"
import { AutoCompleteParams, CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { createCardCanvas } from "@utils/canvas"
import { componentFilter } from "@utils/componentFilter"
import { getCardsList } from "@utils/getItemList"
import {
	ActionRowBuilder,
	APIMessageComponentEmoji,
	APISelectMenuOption,
	ApplicationCommandOptionType,
	AttachmentBuilder,
	ColorResolvable,
	ComponentType,
	EmbedBuilder,
	parseEmoji,
	PermissionsBitField,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	StringSelectMenuBuilder,
} from "discord.js"
import Fuse from "fuse.js"

const config: RESTPostAPIChatInputApplicationCommandsJSONBody = {
	name: "card",
	description: "Shows the information of the specified Card",
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: "name",
			description: `Name of the card`,
			required: true,
			autocomplete: true,
		},
	],
}

const command: SlashCommand = {
	config,
	userPermissions: [],
	botPermissions: [PermissionsBitField.Flags.ReadMessageHistory],
	guildOnly: false,
	ownerOnly: false,
	category: "Info",
	execute,
	autocomplete,
}

async function execute({ interaction, translate }: CommandExecuteParams): Promise<void> {
	await interaction.deferReply()

	const cardToRetrieve = interaction.options.getString("name", true).toLowerCase()

	if (cardToRetrieve.length <= 2) {
		const nameTooShortEmbed = createErrorEmbed({
			title: translate("errors.name_too_short.title"),
			description: translate("errors.name_too_short.description"),
		})

		await interaction.editReply({ embeds: [nameTooShortEmbed] }).catch(() => {})
		return
	}

	const cardsList = getCardsList()

	const cardFoundById = cardsList.find((card) => card.id === Number(cardToRetrieve))

	if (cardFoundById) {
		const cardBuffer = await createCardCanvas(cardFoundById)
		const fileAttachment = new AttachmentBuilder(cardBuffer, {
			name: `${cardFoundById.name.replace(" ", "-")}.png`,
		})
		await interaction.editReply({ files: [fileAttachment] }).catch(() => {})
		return
	}

	const cardsFound = findCards(cardToRetrieve)

	// Error No Cards Found
	if (!cardsFound.length) {
		const cardNotFoundEmbed = createErrorEmbed({
			title: translate("errors.no_cards.title"),
			description: translate("errors.no_cards.description"),
		})

		await interaction.editReply({ embeds: [cardNotFoundEmbed] }).catch(() => {})
		return
	}

	// Only One
	if (cardsFound.length === 1) {
		const cardBuffer = await createCardCanvas(cardsFound[0]!)
		const fileAttachment = new AttachmentBuilder(cardBuffer, {
			name: `${cardsFound[0]!.name.replace(" ", "-")}.png`,
		})
		await interaction.editReply({ files: [fileAttachment] }).catch(() => {})
		return
	}

	// Many
	if (cardsFound.length > MAX_OPTIONS_IN_SELECT_MENU) cardsFound.length = MAX_OPTIONS_IN_SELECT_MENU

	const cardSelectionOptions: APISelectMenuOption[] = cardsFound.map((card) => {
		return {
			label: card.name,
			value: card.id.toString(),
			emoji: parseEmoji(card.emoji) as APIMessageComponentEmoji,
		}
	})

	const cardSelector = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		new StringSelectMenuBuilder()
			.addOptions(cardSelectionOptions)
			.setCustomId("card-selector")
			.setPlaceholder(translate("menu_placeholder"))
	)

	const selectCardEmbed = new EmbedBuilder()
		.setAuthor({
			name: translate("card_found.title", {
				numOfCards: cardsFound.length,
			}),
		})
		.setDescription(translate("card_found.description"))
		.setColor("Blurple")

	const message = await interaction.editReply({
		embeds: [selectCardEmbed],
		components: [cardSelector],
	})

	const collector = message.createMessageComponentCollector<ComponentType.StringSelect>({
		filter: componentFilter(interaction),
		idle: DEFAULT_IDLE_TIME,
	})

	collector.on("collect", async (componentInteraction) => {
		await componentInteraction.deferUpdate()

		const cardToDisplay = cardsFound.find((card) => card.id.toString() === componentInteraction.values[0])!

		cardSelector.components[0]?.options.filter((option) => option.data.default === true)[0]?.setDefault(false)
		cardSelector.components[0]?.options
			.filter((option) => option.data.value === componentInteraction.values[0])[0]
			?.setDefault(true)

		const cardCanvas = await createCardCanvas(cardToDisplay)
		const cardAttachment = new AttachmentBuilder(cardCanvas, {
			name: `${cardToDisplay.name.replace(" ", "-")}.png`,
		})

		const cardEmbed = new EmbedBuilder()
			.setDescription(`${cardToDisplay.emoji} **${cardToDisplay.name}**`)
			.setImage(`attachment://${cardToDisplay.name.replace(" ", "-")}.png`)
			.setColor(cardToDisplay.color as ColorResolvable)

		await componentInteraction
			.editReply({
				embeds: [cardEmbed],
				components: [cardSelector],
				files: [cardAttachment],
				attachments: [],
			})
			.catch(() => {})
	})

	collector.on("end", () => {
		message.edit({ components: [] }).catch(() => {})
	})
}

async function autocomplete({ interaction }: AutoCompleteParams) {
	const focusedValue = interaction.options.getFocused()

	if (!focusedValue) {
		const cardsList = getCardsList()
		await interaction.respond(
			cardsList
				.sort((a, b) => {
					if (a.name < b.name) return -1
					if (a.name > b.name) return 1
					return 0
				})
				.slice(0, 25)
				.map((card) => {
					return {
						name: `${card.name} — (${card.partClass}) (${card.partType})`,
						value: card.id.toString(),
					}
				})
		)
		return
	}

	const choices = findCards(focusedValue)
	if (choices.length > MAX_OPTIONS_IN_SELECT_MENU) choices.length = MAX_OPTIONS_IN_SELECT_MENU

	await interaction.respond(
		choices.map((choice) => {
			return {
				name: `${choice.name} — (${choice.partClass}) (${choice.partType})`,
				value: choice.id.toString(),
			}
		})
	)
}

function findCards(cardName: string) {
	const cardsList = getCardsList()

	const options = {
		threshold: 0.4,
		minMatchCharLength: cardName.length,
		keys: ["name"],
	}

	const fuse = new Fuse(cardsList, options)
	const searchResult = fuse.search(cardName)

	const choices = searchResult.map(({ item }) => item)

	return choices
}

export default command
