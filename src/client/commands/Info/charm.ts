import { getTokenPrice } from "@apis/getTokenPrice"
import { createErrorEmbed } from "@client/components/embeds"
import { MAX_OPTIONS_IN_SELECT_MENU } from "@client/components/selection"
import { DEFAULT_IDLE_TIME } from "@constants/index"
import emojis from "@constants/props/emojis.json"
import { ParsedCharm } from "@custom-types/charm"
import { AutoCompleteParams, CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { componentFilter } from "@utils/componentFilter"
import { currencyFormatter } from "@utils/currencyFormatter"
import { getCharmsList } from "@utils/getItemList"
import {
	APIMessageComponentEmoji,
	APISelectMenuOption,
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ColorResolvable,
	ComponentType,
	EmbedBuilder,
	PermissionsBitField,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	StringSelectMenuBuilder,
	parseEmoji,
} from "discord.js"
import Fuse from "fuse.js"

const config: RESTPostAPIChatInputApplicationCommandsJSONBody = {
	name: "charm",
	description: "Shows the information of the specified charm",
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: "name",
			description: `Name of the charm`,
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

	const charmToFind = interaction.options.getString("name", true).toLowerCase()

	if (charmToFind.length <= 2) {
		const nameTooShortEmbed = createErrorEmbed({
			title: translate("errors.name_too_short.title"),
			description: translate("errors.name_too_short.description"),
		})

		await interaction.editReply({ embeds: [nameTooShortEmbed] }).catch(() => {})
		return
	}

	const charmsList = getCharmsList().filter((charm) => charm.item.id.endsWith("_nft"))

	const charmFoundById = charmsList.find((charm) => charm.item.id === charmToFind)

	if (charmFoundById) {
		const charmEmbed = await createCharmEmbed(charmFoundById)
		await interaction.editReply({ embeds: [charmEmbed] }).catch(() => {})
		return
	}

	const charmsFound = findCharms(charmToFind)

	if (!charmsFound.length) {
		const charmNotFoundEmbed = createErrorEmbed({
			title: translate("errors.not_found.title"),
			description: translate("errors.not_found.description"),
		})

		await interaction.editReply({ embeds: [charmNotFoundEmbed] }).catch(() => {})
		return
	}

	if (charmsFound.length === 1) {
		const charmEmbed = await createCharmEmbed(charmsFound[0]!)
		await interaction.editReply({ embeds: [charmEmbed] }).catch(() => {})
		return
	}

	if (charmsFound.length > MAX_OPTIONS_IN_SELECT_MENU) charmsFound.length = MAX_OPTIONS_IN_SELECT_MENU

	const charmSelectionOptions: APISelectMenuOption[] = charmsFound.map((charm) => {
		const option = {
			label: charm.item.name,
			description: charm.season?.name,
			value: charm.item.id,
			emoji: parseEmoji(charm.rarityEmoji) as APIMessageComponentEmoji,
		}

		if (!option.description) delete option.description

		return option
	})

	const charmSelector = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		new StringSelectMenuBuilder()
			.addOptions(charmSelectionOptions)
			.setCustomId("charm-selector")
			.setPlaceholder(translate("menu_placeholder"))
	)

	const selectCharmEmbed = new EmbedBuilder()
		.setAuthor({
			name: translate("charm_found.title", {
				numOfCharms: charmsFound.length,
			}),
		})
		.setDescription(translate("charm_found.description"))
		.setColor("Blurple")

	const message = await interaction.editReply({
		embeds: [selectCharmEmbed],
		components: [charmSelector],
	})

	const collector = message.createMessageComponentCollector<ComponentType.StringSelect>({
		filter: componentFilter(interaction),
		idle: DEFAULT_IDLE_TIME,
	})

	collector.on("collect", async (componentInteraction) => {
		await componentInteraction.deferUpdate()

		const charmToDisplay = charmsFound.find((charm) => charm.item.id === componentInteraction.values[0])!

		charmSelector.components[0]?.options.filter((option) => option.data.default === true)[0]?.setDefault(false)
		charmSelector.components[0]?.options
			.filter((option) => option.data.value === componentInteraction.values[0])[0]
			?.setDefault(true)

		const charmEmbed = await createCharmEmbed(charmToDisplay)

		await componentInteraction
			.editReply({
				embeds: [charmEmbed],
				components: [charmSelector],
			})
			.catch(() => {})
	})

	collector.on("end", () => {
		message.edit({ components: [] }).catch(() => {})
	})

	async function createCharmEmbed(charm: ParsedCharm) {
		const charmEmbed = new EmbedBuilder()
			.setDescription(`[${charm.classEmoji} ${charm.item.name}](${charm.listingUrl})`)
			.addFields(
				{
					name: translate("fields.effect"),
					value: charm.item.description,
					inline: false,
				},
				{
					name: translate("fields.origins_availability"),
					value: charm.season?.name ?? translate("fields.not_applicable"),
					inline: true,
				},
				{
					name: translate("fields.rarity"),
					value: `${charm.rarityEmoji} ${charm.item.rarity}`,
					inline: true,
				},
				{
					name: translate("fields.potential_points"),
					value: charm.potentialPoint.toString(),
					inline: true,
				}
			)
			.setThumbnail(charm.item.imageUrl)
			.setColor(charm.color as ColorResolvable)

		const charmPrice = globalThis.tokensPrice.find((token) => token.tokenId == charm.item.tokenId)

		if (charmPrice) {
			const ethPrice = Number((parseInt(charmPrice.minPrice) / 1e18).toFixed(6))
			const currencyPrice = await getTokenPrice("ETH", "USD")
			const formattedCurrency = currencyFormatter("USD", ethPrice, currencyPrice.price)

			charmEmbed.addFields({
				name: translate("fields.minimum_price"),
				value: `${emojis.tokens.ethereum} **${ethPrice}**\n${formattedCurrency}`,
			})
		}

		return charmEmbed
	}
}

async function autocomplete({ interaction }: AutoCompleteParams) {
	const focusedValue = interaction.options.getFocused()

	if (!focusedValue) {
		const charmsList = getCharmsList().filter((charm) => charm.item.id.endsWith("_nft"))
		await interaction.respond(
			charmsList
				.sort((a, b) => {
					if (a.item?.name < b.item?.name) return -1
					if (a.item?.name > b.item?.name) return 1
					return 0
				})
				.slice(0, 25)
				.map((charm) => {
					return {
						name: `${charm.item.name} — (${charm.item.rarity}) (${charm.class}) ${
							charm.season?.name ? `(${charm.season.name})` : ``
						}`,
						value: charm.item.id,
					}
				})
		)
		return
	}

	const choices = findCharms(focusedValue)

	if (choices.length > MAX_OPTIONS_IN_SELECT_MENU) choices.length = MAX_OPTIONS_IN_SELECT_MENU

	await interaction.respond(
		choices.map((charm) => {
			return {
				name: `${charm.item.name} — (${charm.item.rarity}) (${charm.class}) ${
					charm.season?.name ? `(${charm.season.name})` : ``
				}`,
				value: charm.item.id,
			}
		})
	)
}

function findCharms(charmName: string) {
	const charmsList = getCharmsList().filter((charm) => charm.item.id.endsWith("_nft"))

	const options = {
		threshold: 0.4,
		minMatchCharLength: charmName.length,
		keys: ["item.name", "class", "season.name", "item.rarity"],
	}

	const fuse = new Fuse(charmsList, options)
	const searchResult = fuse.search(charmName)

	const choices = searchResult.map(({ item }) => item)

	return choices
}

export default command
