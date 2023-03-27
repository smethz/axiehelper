import { getContestLeaderboard } from "@apis/contest-api/getContestLeaderboard"
import { getLeaderboard } from "@apis/game-api/getLeaderboard"
import { createErrorEmbed } from "@client/components/embeds"
import {
	createPages,
	createPaginationButtons,
	getFooter,
	getPageIndex,
	handlePagination,
} from "@client/components/pagination"
import { DEFAULT_IDLE_TIME } from "@constants/index"
import emojis from "@constants/props/emojis.json"
import { AXIES_IO_URL } from "@constants/url"
import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { componentFilter } from "@utils/componentFilter"
import { disableComponents } from "@utils/componentsToggler"
import { numberFormatter } from "@utils/currencyFormatter"
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

	const isArena = interaction.options.getSubcommand(true) === "arena"

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
		const rankOffset = interaction.options.getInteger("rank") || 0
		const leaderboardPlayers = await getLeaderboard({ offset: rankOffset })

		if (!leaderboardPlayers) {
			await interaction.editReply({ embeds: [requestFailedEmbed] }).catch(() => {})
			return
		}

		if (!leaderboardPlayers.length) {
			await interaction.editReply({ embeds: [noPlayersEmbed] }).catch(() => {})
			return
		}

		const parsedLeaderboard = leaderboardPlayers
			.map((player) => {
				return `${player.rankIcon} ${numberFormatter(player.topRank)}. **${numberFormatter(player.vstar)}** ${
					emojis.victory_star
				} — [${player.name}](${AXIES_IO_URL}/profile/${player.userID})`
			})
			.join("\n")

		let pageIndex = 0
		let pages = createPages(parsedLeaderboard)
		const paginationButtons = createPaginationButtons(pageIndex, pages)

		const rankingsEmbed = new EmbedBuilder()
			.setTitle(translate("leaderboard"))
			.setURL(`${AXIES_IO_URL}/leaderboard`)
			.setDescription(pages[pageIndex] as string)
			.setFooter({ text: getFooter(pageIndex, pages, interaction.locale) })
			.setColor("Random")

		const leaderboardMessage = await interaction.editReply({
			embeds: [rankingsEmbed],
			components: [paginationButtons],
		})

		if (pages.length <= 1) return

		const collector = leaderboardMessage.createMessageComponentCollector<ComponentType.Button>({
			idle: DEFAULT_IDLE_TIME,
			filter: componentFilter(interaction),
		})

		collector.on("collect", async (buttonInteraction) => {
			pageIndex = getPageIndex(pageIndex, pages, buttonInteraction.customId)

			handlePagination(buttonInteraction, paginationButtons, leaderboardMessage, pages, pageIndex)
		})

		collector.on("end", () => {
			disableComponents(paginationButtons)

			leaderboardMessage.edit({ components: [paginationButtons] }).catch(() => {})
		})

		return
	}

	// Event Leaderboard
	const contestLeaderboard = await getContestLeaderboard()

	if (!contestLeaderboard) {
		await interaction.editReply({ embeds: [requestFailedEmbed] }).catch(() => {})
		return
	}

	if (!contestLeaderboard.players.length) {
		await interaction.editReply({ embeds: [noPlayersEmbed] }).catch(() => {})
		return
	}

	const parsedLeaderboard = contestLeaderboard.players
		.map((player) => {
			return `${player.rank}. **${numberFormatter(player.total_point)}** pts — [${
				player.user_name
			}](https://axies.io/profile/${player.user_id})`
		})
		.join("\n")

	const isContestEnded = contestLeaderboard.contest.end_time < Date.now() / 1000
	let timestamp = translate("timestamp", {
		context: isContestEnded ? "ended" : "",
		time: contestLeaderboard.contest.end_time,
	})

	let pageIndex = 0
	let pages = createPages(parsedLeaderboard)
	let paginationButtons = createPaginationButtons(pageIndex, pages)

	const contestEmbed = new EmbedBuilder()
		.setTitle(contestLeaderboard.contest.name)
		.setURL(contestLeaderboard.contest.event_url)
		.setDescription(`${timestamp}\n`.concat(pages[pageIndex] as string))
		.setThumbnail(contestLeaderboard.contest.mobile_image_url)
		.setFooter({ text: getFooter(pageIndex, pages, interaction.locale) })
		.setTimestamp()
		.setColor("Random")

	const message = await interaction.editReply({
		embeds: [contestEmbed],
		components: [paginationButtons],
	})

	if (pages.length <= 1) return

	const collector = message.createMessageComponentCollector<ComponentType.Button>({
		idle: DEFAULT_IDLE_TIME,
		filter: componentFilter(interaction),
	})

	collector.on("collect", async (buttonInteraction) => {
		await buttonInteraction.deferUpdate()
		pageIndex = getPageIndex(pageIndex, pages, buttonInteraction.customId)

		contestEmbed.setDescription(`${timestamp}\n`.concat(pages[pageIndex] as string))
		contestEmbed.setFooter({
			text: getFooter(pageIndex, pages, buttonInteraction.locale),
		})
		contestEmbed.setColor("Random")

		paginationButtons = createPaginationButtons(pageIndex, pages)

		await buttonInteraction.editReply({ embeds: [contestEmbed], components: [paginationButtons] }).catch(() => {})
	})

	collector.on("end", () => {
		disableComponents(paginationButtons)

		message.edit({ components: [paginationButtons] }).catch(() => {})
	})
}

export default command
