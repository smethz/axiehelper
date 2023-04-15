import { getContest } from "@apis/contest-api/getContest"
import { getContestLeaderboard } from "@apis/contest-api/getContestLeaderboard"
import { getLeaderboard } from "@apis/game-api/getLeaderboard"
import { getSeasons } from "@apis/game-api/getSeasons"
import { createErrorEmbed } from "@client/components/embeds"
import {
	createPages,
	createPaginationButtons,
	getFooter,
	getPageFromOffset,
	getPageIndex,
} from "@client/components/pagination"
import { DEFAULT_IDLE_TIME } from "@constants/index"
import emojis from "@constants/props/emojis.json"
import { AXIES_IO_URL } from "@constants/url"
import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { ContestPlayer } from "@custom-types/contest"
import { PlayerLeaderboardData } from "@custom-types/profile"
import { componentFilter } from "@utils/componentFilter"
import { disableComponents } from "@utils/componentsToggler"
import { numberFormatter } from "@utils/currencyFormatter"
import { isAPIError } from "@utils/isAPIError"
import { ApplicationCommandOptionType, ComponentType, EmbedBuilder, PermissionsBitField } from "discord.js"

const command: SlashCommand = {
	config: {
		name: "rankings",
		description: "Global Rankings for the Current Season",
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "arena",
				description: "Global Rankings for the Current Season",
				options: [
					{
						type: ApplicationCommandOptionType.Integer,
						name: "rank",
						description: "The leaderboard rank to get",
						required: false,
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "event",
				description: "Get the rankings for the Latest Event",
				options: [
					{
						type: ApplicationCommandOptionType.Integer,
						name: "rank",
						description: "The leaderboard rank to get",
						required: false,
					},
				],
			},
		],
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

	const numOfPlayersPerPage = 20
	const isArena = interaction.options.getSubcommand(true) === "arena"
	const rankInput = interaction.options.getInteger("rank")
	const leaderboardPage = getPageFromOffset(rankInput, numOfPlayersPerPage)

	const requestFailedEmbed = createErrorEmbed({
		title: translate("errors.request_failed.title"),
		description: translate("errors.request_failed.description"),
	})

	const noPlayersEmbed = createErrorEmbed({
		title: translate("errors.no_players.title"),
		description: translate("errors.no_players.description"),
	})

	// Arena Leaderboard
	if (isArena) {
		let arenaLeaderboard = await getLeaderboard({ offset: (leaderboardPage - 1) * 20, limit: numOfPlayersPerPage })

		if (!arenaLeaderboard || isAPIError(arenaLeaderboard)) {
			await interaction.editReply({ embeds: [!arenaLeaderboard ? noPlayersEmbed : requestFailedEmbed] }).catch(() => {})
			return
		}

		const seasons = await getSeasons()

		let seasonTimestamp = ``

		if (seasons) {
			const seasonIds = seasons.map((season) => season.id ?? -Infinity)
			const latestSeason = seasons.find((season) => season.id === Math.max(...seasonIds))
			const isSeasonEnded = latestSeason!.endedAt < Date.now() / 1000

			seasonTimestamp = translate("season_timestamp", {
				context: isSeasonEnded ? "ended" : "ongoing",
				seasonName: latestSeason?.name,
				timestamp: latestSeason?.endedAt,
			})
		}

		let parsedLeaderboard = parseArenaPage(arenaLeaderboard._items)

		const maxPage = Math.floor(arenaLeaderboard._metadata.total / numOfPlayersPerPage) || 1
		let pageIndex = leaderboardPage - 1
		let pages = createPages(parsedLeaderboard)
		let paginationButtons = createPaginationButtons({ pageIndex, maxPage, isDynamic: true })

		const rankingsEmbed = new EmbedBuilder()
			.setTitle(translate("leaderboard"))
			.setURL(`${AXIES_IO_URL}/leaderboard`)
			.setDescription(`${seasonTimestamp}\n`.concat(pages[0] as string))
			.setFooter({ text: getFooter(pageIndex, maxPage, interaction.locale) })
			.setColor("Random")

		const leaderboardMessage = await interaction.editReply({
			embeds: [rankingsEmbed],
			components: [paginationButtons],
		})

		if (maxPage <= 1) return

		const collector = leaderboardMessage.createMessageComponentCollector<ComponentType.Button>({
			idle: DEFAULT_IDLE_TIME,
			filter: componentFilter(interaction),
		})

		collector.on("collect", async (buttonInteraction) => {
			pageIndex = await getPageIndex(buttonInteraction, pageIndex, maxPage)

			arenaLeaderboard = await getLeaderboard({ offset: pageIndex * 20 })

			if (!arenaLeaderboard || isAPIError(arenaLeaderboard)) {
				await interaction
					.editReply({ embeds: [!arenaLeaderboard ? noPlayersEmbed : requestFailedEmbed] })
					.catch(() => {})
				return
			}

			parsedLeaderboard = parseArenaPage(arenaLeaderboard._items)
			pages = createPages(parsedLeaderboard)
			paginationButtons = createPaginationButtons({ pageIndex, maxPage, isDynamic: true })

			rankingsEmbed
				.setDescription(`${seasonTimestamp}\n`.concat(pages[0] as string))
				.setFooter({ text: getFooter(pageIndex, maxPage, interaction.locale) })
				.setTimestamp()
				.setColor("Random")

			await buttonInteraction.editReply({ embeds: [rankingsEmbed], components: [paginationButtons] }).catch(() => {})
		})

		collector.on("end", () => {
			disableComponents(paginationButtons)

			leaderboardMessage.edit({ components: [paginationButtons] }).catch(() => {})
		})

		return
	}

	// Event Leaderboard
	const constestList = await getContest()
	const latestContest = constestList[0]
	if (!latestContest) {
		await interaction.editReply({ embeds: [requestFailedEmbed] }).catch(() => {})
		return
	}

	let contestLeaderboard = await getContestLeaderboard({
		constestId: latestContest.id,
		limit: numOfPlayersPerPage,
		page: leaderboardPage,
	})

	if (!contestLeaderboard || isAPIError(contestLeaderboard)) {
		await interaction.editReply({ embeds: [!contestLeaderboard ? noPlayersEmbed : requestFailedEmbed] }).catch(() => {})
		return
	}

	let parsedLeaderboard = parseContestPage(contestLeaderboard.players)

	const isContestEnded = latestContest!.end_time < Date.now() / 1000

	const constestTimestamp = translate("contest_timestamp", {
		context: isContestEnded ? "ended" : "",
		time: latestContest.end_time,
	})

	const maxPage = Math.floor(contestLeaderboard.total / numOfPlayersPerPage) || 1
	let pageIndex = leaderboardPage - 1
	let pages = createPages(parsedLeaderboard)
	let paginationButtons = createPaginationButtons({ pageIndex, maxPage, isDynamic: true })

	const contestEmbed = new EmbedBuilder()
		.setTitle(latestContest.name)
		.setURL(latestContest.event_url)
		.setDescription(`${constestTimestamp}\n`.concat(pages[0] as string))
		.setThumbnail(latestContest.mobile_image_url)
		.setFooter({ text: getFooter(pageIndex, maxPage, interaction.locale) })
		.setTimestamp()
		.setColor("Random")

	const message = await interaction.editReply({
		embeds: [contestEmbed],
		components: [paginationButtons],
	})

	if (maxPage <= 1) return

	const collector = message.createMessageComponentCollector<ComponentType.Button>({
		idle: DEFAULT_IDLE_TIME,
		filter: componentFilter(interaction),
	})

	collector.on("collect", async (buttonInteraction) => {
		pageIndex = await getPageIndex(buttonInteraction, pageIndex, maxPage)

		contestLeaderboard = await getContestLeaderboard({
			constestId: latestContest!.id,
			limit: numOfPlayersPerPage,
			page: pageIndex + 1,
		})

		if (!contestLeaderboard || isAPIError(contestLeaderboard)) {
			await interaction
				.editReply({ embeds: [!contestLeaderboard ? noPlayersEmbed : requestFailedEmbed] })
				.catch(() => {})
			return
		}

		parsedLeaderboard = parseContestPage(contestLeaderboard.players)
		pages = createPages(parsedLeaderboard)
		paginationButtons = createPaginationButtons({ pageIndex, maxPage, isDynamic: true })

		const contestEmbed = new EmbedBuilder()
			.setTitle(latestContest!.name)
			.setURL(latestContest!.event_url)
			.setDescription(`${constestTimestamp}\n`.concat(pages[0] as string))
			.setThumbnail(latestContest!.mobile_image_url)
			.setFooter({ text: getFooter(pageIndex, maxPage, interaction.locale) })
			.setTimestamp()
			.setColor("Random")

		await buttonInteraction.editReply({ embeds: [contestEmbed], components: [paginationButtons] }).catch(() => {})
	})

	collector.on("end", () => {
		disableComponents(paginationButtons)

		message.edit({ components: [paginationButtons] }).catch(() => {})
	})
}

function parseArenaPage(players: PlayerLeaderboardData[]) {
	return players
		.map((player) => {
			return `${player.rankIcon} ${numberFormatter(player.topRank)}. **${numberFormatter(player.vstar)}** ${
				emojis.victory_star
			} — [${player.name}](${AXIES_IO_URL}/profile/${player.userID})`
		})
		.join("\n")
}

function parseContestPage(players: ContestPlayer[]) {
	return players
		.map((player) => {
			return `${player.rank}. **${numberFormatter(player.total_point)}** pts — [${
				player.user_name
			}](https://axies.io/profile/${player.user_id})`
		})
		.join("\n")
}

export default command
