import { getTokenPrice } from "@apis/getTokenPrice"
import { createErrorEmbed } from "@client/components/embeds"
import { MAX_OPTIONS_IN_SELECT_MENU } from "@client/components/selection"
import { DEFAULT_IDLE_TIME } from "@constants/index"
import emojis from "@constants/props/emojis.json"
import { AutoCompleteParams, CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { ParsedRune } from "@custom-types/rune"
import { componentFilter } from "@utils/componentFilter"
import { currencyFormatter } from "@utils/currencyFormatter"
import { getRunesList } from "@utils/getItemList"
import {
	ActionRowBuilder,
	APIMessageComponentEmoji,
	APISelectMenuOption,
	ApplicationCommandOptionType,
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
	name: "rune",
	description: "Shows the information of the specified rune",
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: "name",
			description: `Name of the rune`,
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

	const runeToFind = interaction.options.getString("name", true).toLowerCase()

	if (runeToFind.length <= 2) {
		const nameTooShortEmbed = createErrorEmbed({
			title: translate("errors.name_too_short.title"),
			description: translate("errors.name_too_short.description"),
		})

		await interaction.editReply({ embeds: [nameTooShortEmbed] }).catch(() => {})
		return
	}

	const runeList = getRunesList()

	const runeFoundById = runeList.find((rune) => rune.item.id === runeToFind)

	if (runeFoundById) {
		const runeEmbed = await createRuneEmbed(runeFoundById)
		await interaction.editReply({ embeds: [runeEmbed] }).catch(() => {})
		return
	}

	const runesFound = findRunes(runeToFind)

	if (!runesFound.length) {
		const runeNotFoundEmbed = createErrorEmbed({
			title: translate("errors.not_found.title"),
			description: translate("errors.not_found.description"),
		})

		await interaction.editReply({ embeds: [runeNotFoundEmbed] }).catch(() => {})
		return
	}

	if (runesFound.length === 1) {
		const runeEmbed = await createRuneEmbed(runesFound[0]!)
		await interaction.editReply({ embeds: [runeEmbed] }).catch(() => {})
		return
	}

	if (runesFound.length > MAX_OPTIONS_IN_SELECT_MENU) runesFound.length = MAX_OPTIONS_IN_SELECT_MENU

	const runeSelectionOptions: APISelectMenuOption[] = runesFound.map((rune) => {
		const option = {
			label: rune.item.name,
			description: rune.season?.name,
			value: rune.item.id,
			emoji: parseEmoji(rune.rarityEmoji) as APIMessageComponentEmoji,
		}

		if (!option.description) delete option.description

		return option
	})

	const runeSelector = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		new StringSelectMenuBuilder()
			.addOptions(runeSelectionOptions)
			.setCustomId("rune-selector")
			.setPlaceholder(translate("menu_placeholder"))
	)

	const selectRuneEmbed = new EmbedBuilder()
		.setAuthor({
			name: translate("rune_found.title", {
				numOfRunes: runesFound.length,
			}),
		})
		.setDescription(translate("rune_found.description"))
		.setColor("Blurple")

	const message = await interaction.editReply({
		embeds: [selectRuneEmbed],
		components: [runeSelector],
	})

	const collector = message.createMessageComponentCollector<ComponentType.StringSelect>({
		filter: componentFilter(interaction),
		idle: DEFAULT_IDLE_TIME,
	})

	collector.on("collect", async (componentInteraction) => {
		await componentInteraction.deferUpdate()

		const runeToDisplay = runesFound.find((rune) => rune.item.id === componentInteraction.values[0])!

		runeSelector.components[0]?.options.filter((option) => option.data.default === true)[0]?.setDefault(false)
		runeSelector.components[0]?.options
			.filter((option) => option.data.value === componentInteraction.values[0])[0]
			?.setDefault(true)

		const runeEMbed = await createRuneEmbed(runeToDisplay)

		await componentInteraction
			.editReply({
				embeds: [runeEMbed],
				components: [runeSelector],
			})
			.catch(() => {})
	})

	collector.on("end", () => {
		message.edit({ components: [] }).catch(() => {})
	})

	async function createRuneEmbed(rune: ParsedRune) {
		const runeEmbed = new EmbedBuilder()
			.setDescription(`[${rune.classEmoji} ${rune.item.name}](${rune.listingUrl})`)
			.addFields(
				{
					name: translate("fields.effect"),
					value: rune.item.description,
					inline: false,
				},
				{
					name: translate("fields.origins_availability"),
					value: rune.season?.name ?? translate("fields.not_applicable"),
					inline: true,
				},
				{
					name: translate("fields.rarity"),
					value: `${rune.rarityEmoji} ${rune.item.rarity}`,
					inline: true,
				}
			)
			.setThumbnail(rune.item.imageUrl)
			.setColor(rune.color as ColorResolvable)

		const runePrice = globalThis.tokensPrice.find((token) => token.tokenId == rune.item.tokenId)

		if (runePrice) {
			const ethPrice = Number((parseInt(runePrice.minPrice) / 1e18).toFixed(6))
			const currencyPrice = await getTokenPrice("ETH", "USD")
			const formattedCurrency = currencyFormatter("USD", ethPrice, currencyPrice.price)

			runeEmbed.addFields({
				name: translate("fields.minimum_price"),
				value: `${emojis.tokens.ethereum} **${ethPrice}**\n${formattedCurrency}`,
			})
		}

		return runeEmbed
	}
}

async function autocomplete({ interaction }: AutoCompleteParams) {
	const focusedValue = interaction.options.getFocused()

	if (!focusedValue) {
		const runesList = getRunesList()
		await interaction.respond(
			runesList
				.sort((a, b) => {
					if (a.item.name < b.item.name) return -1
					if (a.item.name > b.item.name) return 1
					return 0
				})
				.slice(0, 25)
				.map((rune) => {
					return {
						name: `${rune.item.name} — (${rune.item.rarity}) (${rune.class}) ${
							rune.season?.name ? `(${rune.season.name})` : ``
						}`,
						value: rune.item.id,
					}
				})
		)
		return
	}

	const choices = findRunes(focusedValue)

	if (choices.length > MAX_OPTIONS_IN_SELECT_MENU) choices.length = MAX_OPTIONS_IN_SELECT_MENU

	await interaction.respond(
		choices.map((rune) => {
			return {
				name: `${rune.item.name} — (${rune.item.rarity}) (${rune.class}) ${
					rune.season?.name ? `(${rune.season.name})` : ``
				}`,
				value: rune.item.id,
			}
		})
	)
}

function findRunes(runeName: string) {
	const runeList = getRunesList()

	const options = {
		threshold: 0.4,
		minMatchCharLength: runeName.length,
		keys: ["item.name", "class", "season.name", "item.rarity"],
	}

	const fuse = new Fuse(runeList, options)
	const searchResult = fuse.search(runeName)

	const choices = searchResult.map(({ item }) => item)

	return choices
}

export default command
