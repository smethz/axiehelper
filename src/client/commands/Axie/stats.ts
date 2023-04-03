import { resolveProfile } from "@apis/ronin-rest/resolveProfile"
import autocomplete from "@client/components/autocomplete"
import {
	createErrorEmbed,
	sendInvalidFormatError,
	sendInvalidProfileError,
	sendNoSavedProfilesError,
} from "@client/components/embeds"
import { createProfileSelectMenu } from "@client/components/selection"
import { DEFAULT_IDLE_TIME, LATEST_SEASON_ID } from "@constants/index"
import emojis from "@constants/props/emojis.json"
import crafting_table from "@constants/props/exp-table.json"
import { ParsedPlayerBattles } from "@custom-types/battle"
import { CommandExecuteParams, SlashCommand, TranslateFunction } from "@custom-types/command"
import { PlayerItem } from "@custom-types/items"
import { ParsedPlayerIngameProfile, PlayerLeaderboardData } from "@custom-types/profile"
import { componentFilter } from "@utils/componentFilter"
import { disableComponents } from "@utils/componentsToggler"
import { numberFormatter } from "@utils/currencyFormatter"
import { getUser } from "@utils/dbFunctions"
import { getOverallStats } from "@utils/getOverallStats"
import { getPlayerExp } from "@utils/getPlayerExp"
import { isAPIError } from "@utils/isAPIError"
import { getRuneCharmsOverviewField, parseAddress, parseInventory } from "@utils/parsers"
import { determineAddress, isValidClientID, isValidRoninAddress } from "@utils/validateAddress"
import {
	APIEmbedField,
	ApplicationCommandOptionType,
	Collection,
	ComponentType,
	EmbedBuilder,
	PermissionsBitField,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js"

export const expTable = new Collection(crafting_table.entries())

const config: RESTPostAPIChatInputApplicationCommandsJSONBody = {
	name: "stats",
	description: "Get the stats of a user",
	options: [
		{
			type: ApplicationCommandOptionType.User,
			name: "user",
			description: "Get the stats of the specified Discord User",
			required: false,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "id",
			description: "Get the stats of the specified User ID or Ronin Address",
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
	if (!interaction.deferred) await interaction.deferReply()

	let specifiedId = interaction.options.getString("id") ? interaction.options.getString("id")!.toLowerCase() : null
	const specifiedUser = interaction.options.getMember("user") ?? interaction.member

	const noStatsEmbed = createErrorEmbed({
		title: translate("errors.request_failed.title"),
		description: translate("errors.request_failed.description"),
	})

	// -----------------------------------------------------------------------------
	// --------------------------- ADDRESS SPECIFIED -------------------------------
	// -----------------------------------------------------------------------------
	if (specifiedId) {
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

		const playerStats = await getOverallStats(specifiedId)

		if (!playerStats.profile) {
			await interaction.editReply({ embeds: [noStatsEmbed] }).catch(() => {})
			return
		}

		// Create Player Stats Embed
		const playerStatsEmbed = createStatsEmbed(
			playerStats.profile,
			playerStats.leaderboard,
			playerStats.battles,
			playerStats.inventory,
			translate
		)

		await interaction.editReply({ embeds: [playerStatsEmbed] }).catch(() => {})
		return
	}

	// -----------------------------------------------------------------------------
	// ----------------------------- USER SPECIFIED --------------------------------
	// -----------------------------------------------------------------------------

	const dbUser = await getUser(specifiedUser.id)

	if (!dbUser?.savedProfiles.length) {
		await sendNoSavedProfilesError(interaction, specifiedUser.id)
		return
	}

	let playerStats = await getOverallStats(dbUser.savedProfiles[0]?.profileId!)

	if (!playerStats.profile) {
		await interaction.editReply({ embeds: [noStatsEmbed] }).catch(() => {})
		return
	}

	// Create Player Stats Embed
	const playerStatsEmbed = createStatsEmbed(
		playerStats.profile,
		playerStats.leaderboard,
		playerStats.battles,
		playerStats.inventory,
		translate
	)

	let profileSelector = createProfileSelectMenu(dbUser.savedProfiles)

	const message = await interaction.editReply({
		embeds: [playerStatsEmbed],
		components: [profileSelector],
	})
	const collector = message.createMessageComponentCollector<ComponentType.StringSelect>({
		filter: componentFilter(interaction),
		idle: DEFAULT_IDLE_TIME,
	})

	collector.on("collect", async (componentInteraction) => {
		await componentInteraction.deferUpdate()

		disableComponents(profileSelector)
		await componentInteraction.editReply({ components: [profileSelector] }).catch(() => {})

		const selectedProfile = dbUser.savedProfiles.find((profile) => profile.profileId === componentInteraction.values[0])

		playerStats = await getOverallStats(selectedProfile?.profileId!)

		if (!playerStats.profile) {
			await interaction.editReply({ embeds: [noStatsEmbed] }).catch(() => {})
			return
		}

		const playerStatsEmbed = createStatsEmbed(
			playerStats.profile,
			playerStats.leaderboard,
			playerStats.battles,
			playerStats.inventory,
			translate
		)

		profileSelector = createProfileSelectMenu(dbUser.savedProfiles, selectedProfile)

		await componentInteraction.editReply({ embeds: [playerStatsEmbed], components: [profileSelector] }).catch(() => {})
	})

	collector.on("end", () => {
		disableComponents(profileSelector)

		message.edit({ components: [profileSelector] }).catch(() => {})
	})
}

export default command

function createStatsEmbed(
	playerProfile: ParsedPlayerIngameProfile,
	playerRank: PlayerLeaderboardData | undefined,
	playerBattles: ParsedPlayerBattles | undefined,
	playerInventory: PlayerItem[] | undefined,
	translate: TranslateFunction
) {
	const parsedRoninAddress = parseAddress(playerProfile.roninAddress, "ronin")

	const playerName = `[${emojis.axies_io} ${playerProfile.name}](${playerProfile.url.axies_io})`
	const marketplaceURL = `[${emojis.marketplace} ${parsedRoninAddress}](${playerProfile.url.marketplace})`
	const explorerURL = `[${emojis.ronin} Explorer](${playerProfile.url.explorer})`

	let battleFields: APIEmbedField[] = []
	let lastPlayedTime = ``
	if (playerBattles?.battles.length) {
		battleFields = createBattleFields(playerBattles, translate)

		lastPlayedTime = translate("last_played_timestamp", {
			timestamp: `<t:${playerBattles.battles[0]!.ended_time}:R>`,
		})
	}

	const embedTitle = `${playerName}\n${marketplaceURL}\n${explorerURL}\n${lastPlayedTime}`

	const craftingField = playerInventory ? createCraftingField(playerInventory, translate) : []
	const rankFields = playerRank ? createRankFields(playerRank, translate) : []
	const itemFields = playerInventory ? createItemFields(playerInventory) : []

	let playerRunesAndCharmsField: APIEmbedField[] = []
	if (playerInventory) {
		const parsedInventory = parseInventory(playerInventory).filter((item) => {
			if (item.charm) return item.charm.season?.id === LATEST_SEASON_ID
			if (item.rune) return item.rune.season?.id === LATEST_SEASON_ID
			return
		})

		playerRunesAndCharmsField = getRuneCharmsOverviewField(parsedInventory, translate)
	}

	return new EmbedBuilder()
		.setDescription(embedTitle)
		.addFields([...craftingField, ...rankFields, ...battleFields, ...itemFields, ...playerRunesAndCharmsField])
		.setFooter({
			text: playerProfile.userID,
			iconURL: "https://em-content.zobj.net/thumbs/240/toss-face/342/bust-in-silhouette_1f464.png",
		})
		.setColor("Random")
		.setTimestamp()
}

function createCraftingField(playerInventory: PlayerItem[], translate: TranslateFunction) {
	const playerExp = getPlayerExp(playerInventory)
	const xp_stats = `${numberFormatter(playerExp.crafting_exp)} / ${numberFormatter(playerExp.table_exp)} XP`

	return [
		{
			name: translate("crafting_field"),
			value: `**${translate("level")} ${playerExp.level ?? "???"}** - ${xp_stats}`,
			inline: false,
		},
	]
}

function createRankFields(playerRank: PlayerLeaderboardData, translate: TranslateFunction): APIEmbedField[] {
	return [
		{
			name: translate("rank_field"),
			value: `🌍 **#${numberFormatter(playerRank.topRank)}**\n${playerRank.rankIcon} ${playerRank.rank} ${
				playerRank.tier
			}`,
			inline: true,
		},
		{
			name: "Victory Stars",
			value: `${emojis.victory_star} ${numberFormatter(playerRank.vstar)}`,
			inline: true,
		},
	]
}

function createItemFields(playerInventory: PlayerItem[]) {
	const mAXS = playerInventory.find((id) => id.itemId === "maxs")
	const mintablemAXS = mAXS?.withdrawable ? `\n*(**${numberFormatter(mAXS.withdrawable)}** Mintable)*` : ""

	const slp = playerInventory.find((id) => id.itemId === "slp")
	const mintableSlp = slp?.withdrawable ? `\n*(**${numberFormatter(slp.withdrawable)}** Mintable)*` : ""

	const moonshards = playerInventory.find((id) => id.itemId === "moonshard")

	return [
		{
			name: "mAXS",
			value: `${numberFormatter(mAXS?.quantity) ?? "???"} ${emojis.tokens.axs}${mintablemAXS}`,
			inline: true,
		},
		{
			name: `SLP`,
			value: `${numberFormatter(slp?.quantity) ?? "???"} ${emojis.tokens.slp}${mintableSlp}`,
			inline: true,
		},
		{
			name: `Moonshards`,
			value: `${numberFormatter(moonshards?.quantity) ?? "???"} ${emojis.moonshard}`,
			inline: true,
		},
	]
}

function createBattleFields(playerBattles: ParsedPlayerBattles, translate: TranslateFunction): APIEmbedField[] {
	return [
		{
			name: translate("stamina_field"),
			value: `**${playerBattles.currentStamina ?? "???"}** / **${playerBattles.maxStamina ?? "???"}** (${
				playerBattles.numOfPersonalAxies ?? "???"
			} ${emojis.tokens.axie})`,
			inline: true,
		},
		{
			name: translate("wins_field"),
			value: `**${playerBattles.win_total}** (${playerBattles.win_rate}%)`,
			inline: true,
		},
		{
			name: translate("draws_field"),
			value: `**${playerBattles.draw_total}** (${playerBattles.draw_rate}%)`,
			inline: true,
		},
		{
			name: translate("losses_field"),
			value: `**${playerBattles.lose_total}** (${playerBattles.lose_rate}%)`,
			inline: true,
		},
	]
}
