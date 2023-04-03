import { getPlayerProfile } from "@apis/game-api/getPlayerProfile"
import { resolveProfile } from "@apis/ronin-rest/resolveProfile"
import autocomplete from "@client/components/autocomplete"
import {
	createErrorEmbed,
	sendInvalidFormatError,
	sendInvalidProfileError,
	sendNoSavedProfilesError,
} from "@client/components/embeds"
import { createPages, createPaginationButtons, getFooter, getPageIndex } from "@client/components/pagination"
import { PROFILE_SELECTOR_ID, createProfileSelectMenu } from "@client/components/selection"
import { DEFAULT_IDLE_TIME, LATEST_SEASON_ID } from "@constants/index"
import axieClassProps from "@constants/props/axie-class-props.json"
import emojis from "@constants/props/emojis.json"
import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { ItemClass, ItemRarity, PlayerItems } from "@custom-types/items"
import { ParsedPlayerIngameProfile } from "@custom-types/profile"
import { componentFilter } from "@utils/componentFilter"
import { disableComponents, enableComponents } from "@utils/componentsToggler"
import { getUser } from "@utils/dbFunctions"
import { FilterCriteria, deepFilter } from "@utils/deepFilter"
import { getPlayerCharmsAndRunes } from "@utils/getPlayerItems"
import { isAPIError } from "@utils/isAPIError"
import { getRuneCharmsOverviewField } from "@utils/parsers"
import { determineAddress, isValidClientID, isValidRoninAddress } from "@utils/validateAddress"
import {
	APIMessageComponentEmoji,
	APISelectMenuOption,
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ComponentType,
	EmbedBuilder,
	PermissionsBitField,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	StringSelectMenuBuilder,
	parseEmoji,
} from "discord.js"

const config: RESTPostAPIChatInputApplicationCommandsJSONBody = {
	name: "inventory",
	description: "Get the inventory of a user",
	options: [
		{
			type: ApplicationCommandOptionType.User,
			name: "user",
			description: "Get the inventory of the specified Discord User",
			required: false,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "id",
			description: "Get the inventory of the specified User ID or Ronin Address",
			required: false,
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
	category: "Axie",
	execute,
	autocomplete,
}

async function execute({ interaction, translate }: CommandExecuteParams): Promise<void> {
	await interaction.deferReply()

	let specifiedId = interaction.options.getString("id") ? interaction.options.getString("id")!.toLowerCase() : null
	const specifiedUser = interaction.options.getMember("user") ?? interaction.member

	const requestFailedEmbed = createErrorEmbed({
		title: translate("errors.request_failed.title"),
		description: translate("errors.request_failed.description"),
	})

	const emptyInventoryEmbed = createErrorEmbed({
		title: translate("errors.empty_inventory.title"),
		description: translate("errors.empty_inventory.description"),
	})

	// -----------------------------------------------------------------------------
	// --------------------------- ADDRESS SPECIFIED -------------------------------
	// -----------------------------------------------------------------------------
	if (specifiedId) {
		// Format Validation
		if (!isValidClientID(specifiedId) && !isValidRoninAddress(specifiedId)) {
			await sendInvalidFormatError(interaction)
			return
		}

		// Valid Format - No Profile
		if (determineAddress(specifiedId)) {
			const playerProfile = await resolveProfile(specifiedId)
			if (!playerProfile || isAPIError(playerProfile)) {
				await sendInvalidProfileError(interaction)
				return
			}

			specifiedId = playerProfile.accountId
		}

		const playerProfile = await getPlayerProfile(specifiedId)

		if (!playerProfile || isAPIError(playerProfile)) {
			await sendInvalidProfileError(interaction)
			return
		}

		const playerInventory = await getPlayerCharmsAndRunes(specifiedId)

		if (!playerInventory || isAPIError(playerInventory)) {
			await interaction
				.editReply({
					embeds: [!playerInventory ? emptyInventoryEmbed : requestFailedEmbed],
				})
				.catch(() => {})
			return
		}

		const filteredInventory = filterInventory(playerInventory)
		const parsedPlayerInventory = parseInventory(filteredInventory)

		let pageIndex = 0
		let pages = createPages(parsedPlayerInventory)

		if (!pages.length) pages = [translate("errors.no_items")]

		let inventoryOverviewEmbed = createInventoryOverviewEmbed(filteredInventory, playerProfile)
		let inventoryEmbed = createInventoryEmbed(pages, pageIndex, interaction.locale)

		let paginationButtons = createPaginationButtons({ pageIndex, maxPage: pages.length })
		let filterMenu = createFilterMenu()

		const message = await interaction.editReply({
			embeds: [inventoryOverviewEmbed, inventoryEmbed],
			components: [paginationButtons, filterMenu],
		})

		const collector = message.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			idle: DEFAULT_IDLE_TIME,
			filter: componentFilter(interaction),
		})

		collector.on("collect", async (componentInteraction) => {
			await componentInteraction.deferUpdate()

			// Handle Pagination
			if (componentInteraction.isButton()) {
				pageIndex = await getPageIndex(componentInteraction, pageIndex, pages.length)

				inventoryEmbed
					.setDescription(pages[pageIndex] as string)
					.setFooter({ text: getFooter(pageIndex, pages, interaction.locale) })
					.setColor("Random")

				paginationButtons = createPaginationButtons({ pageIndex, maxPage: pages.length })

				await componentInteraction
					.editReply({
						embeds: [inventoryOverviewEmbed, inventoryEmbed],
						components: [paginationButtons, filterMenu],
					})
					.catch(() => {})
			}

			// Handle Filters
			if (componentInteraction.isStringSelectMenu() && componentInteraction.customId === "filter-menu") {
				const filters = componentInteraction.values
				const filteredInventory = filterInventory(playerInventory, filters)
				const parsedFilteredInventory = parseInventory(filteredInventory)

				filterMenu = createFilterMenu(filters)

				pageIndex = 0
				pages = createPages(parsedFilteredInventory)

				if (!pages.length) pages = [translate("errors.no_items")]

				inventoryOverviewEmbed = createInventoryOverviewEmbed(filteredInventory, playerProfile)
				inventoryEmbed = createInventoryEmbed(pages, pageIndex, interaction.locale)

				paginationButtons = createPaginationButtons({ pageIndex, maxPage: pages.length })

				await componentInteraction
					.editReply({
						embeds: [inventoryOverviewEmbed, inventoryEmbed],
						components: [paginationButtons, filterMenu],
					})
					.catch(() => {})
			}
		})

		collector.on("end", () => {
			disableComponents(paginationButtons, filterMenu)
			message.edit({ components: [paginationButtons, filterMenu] }).catch(() => {})
		})

		return
	}

	// -----------------------------------------------------------------------------
	// ----------------------------- USER SPECIFIED --------------------------------
	// -----------------------------------------------------------------------------

	const dbUser = await getUser(specifiedUser.id)

	if (!dbUser?.savedProfiles?.length) {
		await sendNoSavedProfilesError(interaction, specifiedUser.id)
		return
	}

	let playerInventory = await getPlayerCharmsAndRunes(dbUser.savedProfiles[0]!.profileId)

	let playerProfile = await getPlayerProfile(dbUser.savedProfiles[0]!.profileId)

	if (isAPIError(playerInventory) || isAPIError(playerProfile) || !playerInventory || !playerProfile) {
		await interaction
			.editReply({
				embeds: [!playerInventory ? emptyInventoryEmbed : requestFailedEmbed],
			})
			.catch(() => {})
		return
	}

	const filteredInventory = filterInventory(playerInventory)
	const parsedPlayerInventory = parseInventory(filteredInventory)

	let profileSelector = createProfileSelectMenu(dbUser.savedProfiles)

	let pageIndex = 0
	let pages = createPages(parsedPlayerInventory)

	if (!pages.length) pages = [translate("errors.no_items")]

	let inventoryOverviewEmbed = createInventoryOverviewEmbed(filteredInventory, playerProfile)

	let inventoryEmbed = createInventoryEmbed(pages, pageIndex, interaction.locale)

	let paginationButtons = createPaginationButtons({ pageIndex, maxPage: pages.length })
	let filterMenu = createFilterMenu()

	const message = await interaction.editReply({
		embeds: [inventoryOverviewEmbed, inventoryEmbed],
		components: [paginationButtons, filterMenu, profileSelector],
	})

	const collector = message.createMessageComponentCollector<ComponentType.StringSelect | ComponentType.Button>({
		filter: componentFilter(interaction),
		idle: DEFAULT_IDLE_TIME,
	})

	collector.on("collect", async (componentInteraction) => {
		await componentInteraction.deferUpdate()

		// Handle Pagination
		if (componentInteraction.isButton()) {
			pageIndex = await getPageIndex(componentInteraction, pageIndex, pages.length)

			inventoryEmbed.setDescription(pages[pageIndex] as string)
			inventoryEmbed.setFooter({
				text: getFooter(pageIndex, pages, interaction.locale),
			})

			inventoryEmbed.setColor("Random")

			paginationButtons = createPaginationButtons({ pageIndex, maxPage: pages.length })

			await componentInteraction
				.editReply({
					embeds: [inventoryOverviewEmbed, inventoryEmbed],
					components: [paginationButtons, filterMenu, profileSelector],
				})
				.catch(() => {})
			return
		}

		// Handle Profile Change
		if (componentInteraction.isStringSelectMenu() && componentInteraction.customId === PROFILE_SELECTOR_ID) {
			const selectedProfile = dbUser.savedProfiles.find(
				(profile) => profile.profileId === componentInteraction.values[0]
			)

			disableComponents(profileSelector, paginationButtons, filterMenu)
			await componentInteraction
				.editReply({
					components: [paginationButtons, filterMenu, profileSelector],
				})
				.catch(() => {})

			playerInventory = await getPlayerCharmsAndRunes(selectedProfile!.profileId!)
			playerProfile = await getPlayerProfile(selectedProfile!.profileId)

			if (isAPIError(playerInventory) || isAPIError(playerProfile) || !playerInventory?.length || !playerProfile) {
				enableComponents(profileSelector)

				await componentInteraction
					.editReply({
						embeds: [!playerInventory ? emptyInventoryEmbed : requestFailedEmbed],
						components: [paginationButtons, filterMenu, profileSelector],
					})
					.catch(() => {})
				return
			}

			const filteredInventory = filterInventory(playerInventory)
			const parsedPlayerInventory = parseInventory(filteredInventory)

			// Create Inventory Pagination
			pageIndex = 0
			pages = createPages(parsedPlayerInventory)
			paginationButtons = createPaginationButtons({ pageIndex, maxPage: pages.length })
			inventoryOverviewEmbed = createInventoryOverviewEmbed(filteredInventory, playerProfile)
			inventoryEmbed = createInventoryEmbed(pages, pageIndex, interaction.locale)
			filterMenu = createFilterMenu()
			profileSelector = createProfileSelectMenu(dbUser.savedProfiles, selectedProfile)

			await componentInteraction
				.editReply({
					embeds: [inventoryOverviewEmbed, inventoryEmbed],
					components: [paginationButtons, filterMenu, profileSelector],
				})
				.catch(() => {})
		}

		// Handle Filters
		if (componentInteraction.isStringSelectMenu() && componentInteraction.customId === "filter-menu") {
			const filters = componentInteraction.values

			const filteredInventory = filterInventory(playerInventory as PlayerItems, filters)
			const parsedFilteredInventory = parseInventory(filteredInventory)

			filterMenu = createFilterMenu(filters)

			pageIndex = 0
			pages = createPages(parsedFilteredInventory)

			if (!pages.length) pages = [translate("errors.no_items")]

			inventoryOverviewEmbed = createInventoryOverviewEmbed(
				filteredInventory,
				playerProfile as ParsedPlayerIngameProfile
			)
			inventoryEmbed = createInventoryEmbed(pages, pageIndex, interaction.locale)

			paginationButtons = createPaginationButtons({ pageIndex, maxPage: pages.length })

			await componentInteraction
				.editReply({
					embeds: [inventoryOverviewEmbed, inventoryEmbed],
					components: [paginationButtons, filterMenu, profileSelector],
				})
				.catch(() => {})
		}
	})

	collector.on("end", () => {
		disableComponents(profileSelector, paginationButtons, filterMenu)
		message.edit({ components: [paginationButtons, filterMenu, profileSelector] }).catch(() => {})
	})

	function createFilterMenu(activeFilters: string[] = [`season-${LATEST_SEASON_ID}`]) {
		const classOptions: APISelectMenuOption[] = Object.values(ItemClass).map((axieClass) => {
			const emoji = axieClassProps[axieClass.toLowerCase() as keyof typeof axieClassProps].emoji
			const pasrsedEmoji = parseEmoji(emoji) as APIMessageComponentEmoji

			return {
				label: translate(`labels.${axieClass}`),
				value: `class-${axieClass}`,
				emoji: pasrsedEmoji,
			}
		})

		const rarityOptions: APISelectMenuOption[] = Object.values(ItemRarity).map((rarity) => {
			return {
				label: translate(`labels.${rarity.toLowerCase()}`),
				value: `rarity-${rarity}`,
				emoji: parseEmoji(
					emojis.rarity[rarity.toLowerCase() as keyof typeof emojis.rarity]
				) as APIMessageComponentEmoji,
			}
		})

		const seasonOptions: APISelectMenuOption[] = Array.from({ length: LATEST_SEASON_ID }, (_, index) => {
			return {
				label: translate("labels.season", { seasonId: index.toString() }),
				value: `season-${index + 1}`,
			}
		})

		let filterOptions: APISelectMenuOption[] = [
			{
				label: translate("labels.charms"),
				value: "charm",
				emoji: parseEmoji(emojis.tokens.axie_charm) as APIMessageComponentEmoji,
			},
			{
				label: translate("labels.runes"),
				value: "rune",
				emoji: parseEmoji(emojis.tokens.axie_rune) as APIMessageComponentEmoji,
			},
			{
				label: translate("labels.mintable"),
				value: "withdrawable",
				emoji: { name: "✅" },
			},
			{
				label: translate("labels.upcoming_mintable"),
				value: "nextWithdrawTime",
				emoji: { name: "⏰" },
			},
			...seasonOptions,
			...rarityOptions,
			...classOptions,
		]

		filterOptions = filterOptions.map((options) => {
			if (activeFilters.includes(options.value)) {
				options["default"] = true
			}

			return options
		})

		return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId("filter-menu")
				.setPlaceholder(translate("labels.placeholder"))
				.addOptions(filterOptions)
				.setMaxValues(filterOptions.length)
		)
	}

	function parseInventory(playerInventory: PlayerItems): string {
		return playerInventory
			.filter((item) => item.quantity >= 1)
			.map((item) => {
				const itemName =
					item.charm?.listingUrl || item.rune?.listingUrl
						? `[${item.charm?.item.name || item.rune?.item.name}](${item.charm?.listingUrl || item.rune?.listingUrl})`
						: item.charm?.item.name || item.rune?.item.name

				let itemSeason = item.charm?.season?.name || item.rune?.season?.name
				itemSeason ??= ""

				const itemWithdrawable = item.withdrawable ? `*(**${item.withdrawable}** ${translate("labels.mintable")})*` : ""

				const nextWithdrawableDate = item.nextWithdrawTime && !item.withdrawable ? `<t:${item.nextWithdrawTime}:R>` : ""

				return (
					`**x${item.quantity}** ${nextWithdrawableDate} ${itemWithdrawable}` +
					` — ${item.charm?.rarityEmoji || item.rune?.rarityEmoji}` +
					` ${item.charm?.classEmoji || item.rune?.classEmoji}` +
					` ${itemName} ${itemSeason}`
				)
			})
			.join("\n")
	}

	function createInventoryOverviewEmbed(
		playerInventory: PlayerItems,
		playerProfile: ParsedPlayerIngameProfile
	): EmbedBuilder {
		const inventoryOverviewEmbed = new EmbedBuilder()
			.setDescription(
				`[${emojis.axies_io} ${translate("title", { playerName: playerProfile.name })}](${playerProfile.url.axies_io})`
			)
			.addFields(getRuneCharmsOverviewField(playerInventory, translate))
			.setColor("Random")

		return inventoryOverviewEmbed
	}
}

export default command

function createInventoryEmbed(pages: string[], currentPage: number, locale: string): EmbedBuilder {
	const inventoryEmbed = new EmbedBuilder()
		.setDescription(pages[currentPage] as string)
		.setFooter({ text: getFooter(currentPage, pages, locale) })
		.setColor("Random")

	return inventoryEmbed
}

function filterInventory(playerInventory: PlayerItems, tags: string[] = [`season-${LATEST_SEASON_ID}`]) {
	const seasons = tags.filter((tag) => tag.startsWith("season")).map((tag) => parseInt(tag.split("-")[1] as string))
	const rarities = tags.filter((tag) => tag.startsWith("rarity")).map((tag) => tag.split("-")[1])
	const classes = tags.filter((tag) => tag.startsWith("class")).map((tag) => tag.split("-")[1])
	const withdrawable = tags.find((tag) => tag === "withdrawable") === "withdrawable"
	const nextWithdrawTime = tags.find((tag) => tag === "nextWithdrawTime") === "nextWithdrawTime"
	const itemType = tags.filter((tag) => tag === "charm" || tag === "rune")

	const defaultSeasons = Array.from({ length: LATEST_SEASON_ID }, (_, index) => index + 1)
	const defaultRarities = Object.values(ItemRarity)
	const defaultClasses = Object.values(ItemClass)

	let charmFilter: FilterCriteria = {
		"charm.item.rarity": rarities.length ? rarities : defaultRarities,
		"charm.season.id": seasons.length ? seasons : defaultSeasons,
		"charm.class": classes.length ? classes : defaultClasses,
	}

	let runeFilter: FilterCriteria = {
		"rune.item.rarity": rarities.length ? rarities : defaultRarities,
		"rune.season.id": seasons.length ? seasons : defaultSeasons,
		"rune.class": classes.length ? classes : defaultClasses,
	}

	if (withdrawable) {
		charmFilter["withdrawable"] = withdrawable
		runeFilter["withdrawable"] = withdrawable
	}

	if (nextWithdrawTime) {
		charmFilter["nextWithdrawTime"] = nextWithdrawTime
		runeFilter["nextWithdrawTime"] = nextWithdrawTime
	}

	let filteredItems

	if (itemType.length === 1) {
		// Either Charm or Rune
		const itemFilter = itemType.includes("charm") ? charmFilter : runeFilter

		filteredItems = deepFilter(playerInventory, itemFilter)
	} else {
		const filteredCharms = deepFilter(playerInventory, charmFilter)
		const filteredRunes = deepFilter(playerInventory, runeFilter)

		filteredItems = [...filteredCharms, ...filteredRunes]
	}

	return filteredItems
}
