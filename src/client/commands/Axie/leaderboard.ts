import { createErrorEmbed } from "@client/components/embeds"
import { createPages, createPaginationButtons, getFooter, getPageIndex } from "@client/components/pagination"
import { DEFAULT_IDLE_TIME } from "@constants/index"
import emojis from "@constants/props/emojis.json"
import { ParsedPlayerBattles } from "@custom-types/battle"
import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { PlayerItem } from "@custom-types/items"
import { Division, ParsedPlayerIngameProfile, PlayerLeaderboardData, Tier } from "@custom-types/profile"
import { ActionRowBuilder, StringSelectMenuBuilder } from "@discordjs/builders"
import { componentFilter } from "@utils/componentFilter"
import { disableComponents } from "@utils/componentsToggler"
import { numberFormatter } from "@utils/currencyFormatter"
import { getGuildLeaderboard } from "@utils/dbFunctions"
import { getOverallStats } from "@utils/getOverallStats"
import { getPlayerExp } from "@utils/getPlayerExp"
import { createItemFieldText, getInventoryWeight, parseInventory } from "@utils/parsers"
import { isFulfilled } from "@utils/promiseHandler"
import { sortList } from "@utils/sortList"
import { APIMessageComponentEmoji, ComponentType, EmbedBuilder, PermissionsBitField, parseEmoji } from "discord.js"

interface ParsedPlayerStats {
	userId: string
	name: string | undefined
	level: number | undefined
	crafting_xp: number | undefined
	currentStamina: number | undefined
	maxStamina: number | undefined
	numOfPersonalAxies: number | undefined
	xp_stats: string
	vstars: number | undefined
	rank: Division | undefined
	topRank: number | undefined
	tier: Tier | undefined
	rankIcon: string | undefined
	url: string | undefined
	axs: number | undefined
	mintable_axs: number | undefined
	slp: number | undefined
	mintable_slp: number | undefined
	moonshards: number | undefined
	charmsWeight?: number | undefined
	runesWeight?: number | undefined
	inventory: PlayerItem[] | undefined
}

const command: SlashCommand = {
	config: {
		name: "leaderboard",
		description: "Guild's Custom Leaderboard",
	},
	userPermissions: [],
	botPermissions: [PermissionsBitField.Flags.ReadMessageHistory],
	guildOnly: false,
	ownerOnly: false,
	category: "Axie",
	execute,
}

async function execute({ interaction, translate }: CommandExecuteParams): Promise<void> {
	await interaction.deferReply()

	const dbGuild = await getGuildLeaderboard(interaction.guildId)

	if (!dbGuild?.leaderboard.length) {
		const errorEmbed = createErrorEmbed({
			title: translate("errors.empty_leaderboard.title", {
				guildName: interaction.guild.name,
			}),
			description: translate("errors.empty_leaderboard.description"),
		})
		await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {})
		return
	}

	const players = (
		await Promise.allSettled(
			dbGuild.leaderboard.map((player) => {
				return getOverallStats(player.id)
			})
		)
	)
		.filter(isFulfilled)
		.flatMap((v) => parseLeaderboardPlayerStats(v.value))

	let sortedPlayers = sortLeaderboard(players)

	const filterSelector = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		new StringSelectMenuBuilder().setCustomId("filter-menu").addOptions([
			{
				value: "vstars",
				label: translate("labels.vstars"),
				emoji: parseEmoji(emojis.victory_star) as APIMessageComponentEmoji,
				default: true,
			},
			{
				value: "rank",
				label: translate("labels.rank"),
				emoji: { name: "🌍" },
			},
			{
				value: "stamina",
				label: translate("labels.stamina"),
				emoji: { name: "⚡" },
			},
			{
				value: "level",
				label: translate("labels.crafting_level"),
				emoji: parseEmoji(emojis.exp) as APIMessageComponentEmoji,
			},
			{
				value: "runes",
				label: translate("runes", { ns: "common" }),
				emoji: parseEmoji(emojis.tokens.axie_rune) as APIMessageComponentEmoji,
			},
			{
				value: "charms",
				label: translate("charms", { ns: "common" }),
				emoji: parseEmoji(emojis.tokens.axie_charm) as APIMessageComponentEmoji,
			},
			{
				value: "slp",
				label: "SLP",
				emoji: parseEmoji(emojis.tokens.slp) as APIMessageComponentEmoji,
			},
			{
				value: "moonshards",
				label: "Moonshards",
				emoji: parseEmoji(emojis.moonshard) as APIMessageComponentEmoji,
			},
			{
				value: "axs",
				label: "mAXS",
				emoji: parseEmoji(emojis.tokens.axs) as APIMessageComponentEmoji,
			},
		])
	)

	let pageIndex = 0
	let pages = createPages(sortedPlayers)
	let paginationButtons = createPaginationButtons({ pageIndex, maxPage: pages.length })

	const rankingsEmbed = new EmbedBuilder()
		.setAuthor({
			name: translate("leaderboard_title", {
				guildName: interaction.guild.name,
			}),
			iconURL: interaction.guild.iconURL()!,
		})
		.setDescription(pages[pageIndex] as string)
		.setFooter({ text: getFooter(pageIndex, pages, interaction.locale) })
		.setColor("Random")

	const message = await interaction.editReply({
		embeds: [rankingsEmbed],
		components: [filterSelector, paginationButtons],
	})

	const collecttor = message.createMessageComponentCollector<ComponentType.StringSelect | ComponentType.Button>({
		filter: componentFilter(interaction),
		idle: DEFAULT_IDLE_TIME,
	})

	collecttor.on("collect", async (componentInteraction) => {
		await componentInteraction.deferUpdate()

		// Handle Pagination
		if (componentInteraction.isButton()) {
			pageIndex = await getPageIndex(componentInteraction, pageIndex, pages.length)

			rankingsEmbed.setDescription(pages[pageIndex] as string)
			rankingsEmbed.setFooter({
				text: getFooter(pageIndex, pages, componentInteraction.locale),
			})
			rankingsEmbed.setColor("Random")

			paginationButtons = createPaginationButtons({ pageIndex, maxPage: pages.length })

			await componentInteraction
				.editReply({
					embeds: [rankingsEmbed],
					components: [filterSelector, paginationButtons],
				})
				.catch(() => {})
		}

		// Hande Sort Filter
		if (componentInteraction.isStringSelectMenu()) {
			filterSelector.components[0]?.options.filter((option) => option.data.default === true)[0]?.setDefault(false)
			filterSelector.components[0]?.options
				.filter((option) => option.data.value === componentInteraction.values[0])[0]
				?.setDefault(true)

			const sortType = componentInteraction.values[0]

			sortedPlayers = sortLeaderboard(players, sortType)
			pageIndex = 0
			const itemsPerPage = sortType === "charms" || sortType === "runes" ? 10 : 20
			pages = createPages(sortedPlayers, itemsPerPage)
			paginationButtons = createPaginationButtons({ pageIndex, maxPage: pages.length })

			rankingsEmbed.setDescription(pages[pageIndex] as string)
			rankingsEmbed.setFooter({
				text: getFooter(pageIndex, pages, componentInteraction.locale),
			})

			await interaction
				.editReply({
					embeds: [rankingsEmbed],
					components: [filterSelector, paginationButtons],
				})
				.catch(() => {})
		}
	})

	collecttor.on("end", () => {
		disableComponents(filterSelector, paginationButtons)
		interaction.editReply({ components: [filterSelector, paginationButtons] }).catch(() => {})
	})
}

export default command

interface Sorter {
	[key: string]: {
		key: string
		direction: "ascending" | "descending"
		text: (player: ParsedPlayerStats, index: number) => string
	}
}

function sortLeaderboard(players: ParsedPlayerStats[], sortType: string = "vstars"): string {
	const sorter: Sorter = {
		stamina: {
			key: "currentStamina",
			direction: "descending",
			text: (player: ParsedPlayerStats, index: number) => {
				return `${index + 1}. **${player.currentStamina ?? "???"}** ⚡ / ${player.maxStamina ?? "???"} — ${
					player.numOfPersonalAxies ?? "???"
				} ${emojis.tokens.axie}`
			},
		},
		rank: {
			key: "topRank",
			direction: "ascending",
			text: (player: ParsedPlayerStats) => {
				return `${player.rankIcon} **#${numberFormatter(player.topRank) ?? "???"}**`
			},
		},
		slp: {
			key: "slp",
			direction: "descending",
			text: (player: ParsedPlayerStats, index: number) => {
				return `${index + 1}. **${numberFormatter(player.slp) ?? "???"}** ${
					player.mintable_slp ? `(${numberFormatter(player.mintable_slp)})` : ``
				} ${emojis.tokens.slp}`
			},
		},
		axs: {
			key: "axs",
			direction: "descending",
			text: (player: ParsedPlayerStats, index: number) => {
				return `${index + 1}. **${numberFormatter(player.axs) ?? "???"}** ${
					player.mintable_axs ? `(${numberFormatter(player.mintable_axs)})` : ``
				} ${emojis.tokens.axs}`
			},
		},
		moonshards: {
			key: "moonshards",
			direction: "descending",
			text: (player: ParsedPlayerStats, index: number) => {
				return `${index + 1}. **${numberFormatter(player.moonshards) ?? "???"}** ${emojis.moonshard}`
			},
		},
		level: {
			key: "crafting_xp",
			direction: "descending",
			text: (player: ParsedPlayerStats, index: number) => {
				return `${index + 1}. Level **${player.level ?? "???"}** ${player.xp_stats}`
			},
		},
		vstars: {
			key: "vstars",
			direction: "descending",
			text: (player: ParsedPlayerStats, index: number) => {
				return `${player.rankIcon} ${index + 1}. **${numberFormatter(player.vstars) ?? "???"}** ${emojis.victory_star}`
			},
		},
		charms: {
			key: "charmsWeight",
			direction: "descending",
			text: (player: ParsedPlayerStats, index: number) => {
				return `${index + 1}. ${createItemFieldText(player.inventory, "charm")}`
			},
		},
		runes: {
			key: "runesWeight",
			direction: "descending",
			text: (player: ParsedPlayerStats, index: number) => {
				return `${index + 1}. ${createItemFieldText(player.inventory, "rune")}`
			},
		},
	}

	const sortedList = sortList(
		players,
		sorter[sortType as keyof typeof sorter]!.key,
		sorter[sortType as keyof typeof sorter]!.direction
	)

	return sortedList
		.map((player, index) => {
			let text = sorter[sortType as keyof typeof sorter]!.text(player, index)
			text += ` — [${player.name}](${player.url})`
			return text
		})
		.join("\n")
}

function parseLeaderboardPlayerStats(player: {
	userId: string
	profile: ParsedPlayerIngameProfile | undefined
	leaderboard: PlayerLeaderboardData | undefined
	battles: ParsedPlayerBattles | undefined
	inventory: PlayerItem[] | undefined
}): ParsedPlayerStats {
	const axs = player.inventory?.find((i) => i.itemId === "maxs")
	const slp = player.inventory?.find((i) => i.itemId === "slp")
	const moonshards = player.inventory?.find((i) => i.itemId === "moonshard")

	const { level, crafting_exp, table_exp } = getPlayerExp(player.inventory)
	const xp_stats = `${numberFormatter(crafting_exp)} / ${numberFormatter(table_exp)} XP`

	const parsedInventory = player.inventory
		? parseInventory(player.inventory).filter((item) => {
				if (item.charm) return item.charm.season?.id === globalThis.CURRENT_SEASON_ID
				if (item.rune) return item.rune.season?.id === globalThis.CURRENT_SEASON_ID
				return
		  })
		: undefined

	const inventoryWeight = getInventoryWeight(parsedInventory)

	return {
		userId: player.userId,
		name: player.profile?.name,
		level: level,
		crafting_xp: crafting_exp,
		currentStamina: player.battles?.currentStamina,
		maxStamina: player.battles?.maxStamina,
		numOfPersonalAxies: player.battles?.numOfPersonalAxies,
		xp_stats: xp_stats,
		vstars: player.leaderboard?.vstar,
		rank: player.leaderboard?.rank,
		tier: player.leaderboard?.tier,
		topRank: player.leaderboard?.topRank,
		rankIcon: player.leaderboard?.rankIcon,
		url: player.profile?.url.axies_io,
		axs: axs?.quantity,
		mintable_axs: axs?.withdrawable,
		slp: slp?.quantity,
		mintable_slp: slp?.withdrawable,
		moonshards: moonshards?.quantity,
		charmsWeight: inventoryWeight.charms_weight,
		runesWeight: inventoryWeight.runes_weight,
		inventory: parsedInventory,
	}
}
