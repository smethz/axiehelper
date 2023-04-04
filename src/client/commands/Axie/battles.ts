import { getPlayerBattles } from "@apis/game-api/getPlayerBattles"
import { getPlayerProfile } from "@apis/game-api/getPlayerProfile"
import { getBattleReplay } from "@apis/getBattleReplay"
import { resolveProfile } from "@apis/ronin-rest/resolveProfile"
import autocomplete from "@client/components/autocomplete"
import {
	createErrorEmbed,
	sendInvalidFormatError,
	sendInvalidProfileError,
	sendNoSavedProfilesError,
} from "@client/components/embeds"
import { PROFILE_SELECTOR_ID, createDynamicSelection, createProfileSelectMenu } from "@client/components/selection"
import { DEFAULT_IDLE_TIME } from "@constants/index"
import emojis from "@constants/props/emojis.json"
import { AXIES_IO_URL, MARKETPLACE_URL } from "@constants/url"
import { Fighter, ParsedArenaBattle, ParsedPlayerBattles } from "@custom-types/battle"
import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { createBattleCanvas, createBattleStatsCanvas } from "@utils/canvas"
import { componentFilter } from "@utils/componentFilter"
import { disableComponents, enableComponents } from "@utils/componentsToggler"
import { getUser } from "@utils/dbFunctions"
import { isAPIError } from "@utils/isAPIError"
import { parseAddress } from "@utils/parsers"
import { determineAddress, isValidClientID, isValidRoninAddress } from "@utils/validateAddress"
import dayjs from "dayjs"
import localizedFormat from "dayjs/plugin/localizedFormat"
import relativeTime from "dayjs/plugin/relativeTime"
import {
	APISelectMenuOption,
	ActionRowBuilder,
	ApplicationCommandOptionType,
	AttachmentBuilder,
	ComponentType,
	EmbedBuilder,
	PermissionsBitField,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	StringSelectMenuBuilder,
} from "discord.js"

dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)

const config: RESTPostAPIChatInputApplicationCommandsJSONBody = {
	name: "battles",
	description: "Get the battle stats of a user",
	options: [
		{
			type: ApplicationCommandOptionType.User,
			name: "user",
			description: "Get the battles of the specified Discord User",
			required: false,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "id",
			description: "Get the battles of the specified User ID or Ronin Address",
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
	const specifiedUser = interaction.options.getMember("user") ?? interaction.user

	const failedBattlesEmbed = createErrorEmbed({
		title: translate("errors.request_failed.title"),
		description: translate("errors.request_failed.description"),
	})

	const noBattlesEmbed = createErrorEmbed({
		title: translate("errors.no_recent_battles.title"),
		description: translate("errors.no_recent_battles.description"),
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

		const playerBattles = await getPlayerBattles(specifiedId)

		if (isAPIError(playerBattles) || !playerBattles) {
			await interaction
				.editReply({
					embeds: [!playerBattles ? failedBattlesEmbed : noBattlesEmbed],
				})
				.catch(() => {})
			return
		}

		const playerTeamCanvas = await createBattleStatsCanvas(playerBattles.last_used_team, playerBattles.most_used_team)

		const imgAttachment = new AttachmentBuilder(playerTeamCanvas, {
			name: "teams.png",
		})
		const playerBattleStatsEmbed = createBattleStatsEmbed(playerBattles)
		const battleSelectionMenu = createBattleSelection(playerBattles.battles)
		battleSelectionMenu.components[0]?.setPlaceholder(translate("placeholder.select_battle"))

		const message = await interaction.editReply({
			embeds: [playerBattleStatsEmbed],
			components: [battleSelectionMenu],
			files: [imgAttachment],
		})

		const collector = message.createMessageComponentCollector<ComponentType.StringSelect>({
			idle: DEFAULT_IDLE_TIME,
			filter: componentFilter(interaction),
		})

		collector.on("collect", async (battleMenuInteraction) => {
			await battleMenuInteraction.deferUpdate()

			const selectedBattle = playerBattles.battles.find(
				(battle) => battle.battle_uuid === battleMenuInteraction.values[0]
			)

			battleSelectionMenu.components[0]?.setDisabled(true)
			await battleMenuInteraction.editReply({ components: [battleSelectionMenu] }).catch(() => {})

			const selectedMenu = createBattleSelection(playerBattles.battles, selectedBattle?.battleIndex)

			const rpsWinner = await getBattleReplay(selectedBattle!.battle_uuid)
			if (rpsWinner) selectedBattle!.rps_winner = rpsWinner

			const battleEmbed = await createBattleEmbed(selectedBattle!)

			selectedMenu.components[0]?.options
				.filter((option) => option.data.value === battleMenuInteraction.values[0])[0]
				?.setDefault(true)

			const battleCanvas = await createBattleCanvas(selectedBattle!.player.fighters, selectedBattle!.opponent.fighters)
			const imgAttachment = new AttachmentBuilder(battleCanvas, {
				name: "battle.png",
			})

			await battleMenuInteraction
				.editReply({
					embeds: [battleEmbed],
					components: [selectedMenu],
					files: [imgAttachment],
					attachments: [],
				})
				.catch(() => {})
		})

		collector.on("end", () => {
			disableComponents(battleSelectionMenu)
			message.edit({ components: [battleSelectionMenu] }).catch(() => {})
		})

		return
	}

	// -----------------------------------------------------------------------------
	// ----------------------------- USER SPECIFIED --------------------------------
	// -----------------------------------------------------------------------------
	const user = await getUser(specifiedUser.id)

	if (!user?.savedProfiles?.length) {
		await sendNoSavedProfilesError(interaction, specifiedUser.id)
		return
	}

	let playerBattles = await getPlayerBattles(user.savedProfiles[0]?.profileId!)

	// No Battles - API Failed | No Battles
	if (isAPIError(playerBattles) || !playerBattles) {
		await interaction
			.editReply({
				embeds: [!playerBattles ? failedBattlesEmbed : noBattlesEmbed],
			})
			.catch(() => {})
		return
	}

	// Display Battle Stats
	const playerTeamCanvas = await createBattleStatsCanvas(playerBattles.last_used_team, playerBattles.most_used_team)

	const imgAttachment = new AttachmentBuilder(playerTeamCanvas, {
		name: "teams.png",
	})
	const playerBattleStatsEmbed = createBattleStatsEmbed(playerBattles)
	let battleSelector = createBattleSelection(playerBattles.battles)
	battleSelector.components[0]?.setPlaceholder(translate("placeholder.select_battle"))

	let profileSelector = createProfileSelectMenu(user.savedProfiles)

	// Many Address, Many Battles
	const message = await interaction.editReply({
		embeds: [playerBattleStatsEmbed],
		components: [battleSelector, profileSelector],
		files: [imgAttachment],
	})

	const collector = message.createMessageComponentCollector<ComponentType.StringSelect>({
		filter: componentFilter(interaction),
		idle: DEFAULT_IDLE_TIME,
	})

	collector.on("collect", async (selectMenuInteraction) => {
		await selectMenuInteraction.deferUpdate()
		// Change Battle
		if (selectMenuInteraction.customId === "selected-battle") {
			const selectedBattle = (playerBattles as ParsedPlayerBattles).battles.find(
				(battle) => battle.battle_uuid === selectMenuInteraction.values[0]
			)

			disableComponents(battleSelector, profileSelector)

			await selectMenuInteraction
				.editReply({
					components: [battleSelector, profileSelector],
				})
				.catch(() => {})

			battleSelector = createBattleSelection(
				(playerBattles as ParsedPlayerBattles).battles,
				selectedBattle?.battleIndex
			)

			const rpsWinner = await getBattleReplay(selectedBattle!.battle_uuid)
			if (rpsWinner) selectedBattle!.rps_winner = rpsWinner

			const battleEmbed = await createBattleEmbed(selectedBattle!)

			battleSelector.components[0]?.options
				.filter((option) => option.data.value === selectMenuInteraction.values[0])[0]
				?.setDefault(true)

			const battleCanvas = await createBattleCanvas(selectedBattle!.player.fighters, selectedBattle!.opponent.fighters)
			const imgAttachment = new AttachmentBuilder(battleCanvas, {
				name: "battle.png",
			})

			enableComponents(battleSelector, profileSelector)

			await selectMenuInteraction
				.editReply({
					embeds: [battleEmbed],
					components: [battleSelector, profileSelector],
					files: [imgAttachment],
					attachments: [],
				})
				.catch(() => {})
		}

		// Change User
		if (selectMenuInteraction.customId === PROFILE_SELECTOR_ID) {
			battleSelector.components[0]?.setPlaceholder(translate("placeholder.profile_retrieve"))

			const selectedProfile = user.savedProfiles.find(
				(profile) => profile.profileId === selectMenuInteraction.values[0]
			)

			disableComponents(battleSelector, profileSelector)

			await selectMenuInteraction
				.editReply({
					components: [battleSelector, profileSelector],
				})
				.catch(() => {})

			playerBattles = await getPlayerBattles(selectMenuInteraction.values[0]!)

			// No Battles - API Failed | No Battles
			if (isAPIError(playerBattles) || !playerBattles) {
				enableComponents(profileSelector)
				await interaction
					.editReply({
						embeds: [!playerBattles ? failedBattlesEmbed : noBattlesEmbed],
						components: [profileSelector],
						attachments: [],
					})
					.catch(() => {})
				return
			}

			// Display Battle Stats
			const newPlayerTeamCanvas = await createBattleStatsCanvas(
				playerBattles.last_used_team,
				playerBattles.most_used_team
			)

			const newImgAttachment = new AttachmentBuilder(newPlayerTeamCanvas, {
				name: "teams.png",
			})
			const newPlayerBattleStatsEmbed = createBattleStatsEmbed(playerBattles)
			battleSelector = createBattleSelection(playerBattles.battles)
			battleSelector.components[0]?.setPlaceholder(translate("placeholder.select_battle"))

			profileSelector = createProfileSelectMenu(user.savedProfiles, selectedProfile)

			await selectMenuInteraction
				.editReply({
					embeds: [newPlayerBattleStatsEmbed],
					components: [battleSelector, profileSelector],
					files: [newImgAttachment],
					attachments: [],
				})
				.catch(() => {})
		}
	})

	collector.on("end", () => {
		disableComponents(battleSelector, profileSelector)

		message
			.edit({
				components: [battleSelector, profileSelector],
			})
			.catch(() => {})
	})

	// Functions are inside this scope so I don't have to pass the TranslateFunction as the parameter of these functions

	function createBattleStatsEmbed(battles: ParsedPlayerBattles): EmbedBuilder {
		const playerName = battles.player
			? `[${emojis.axies_io} ${battles.player.name}](${AXIES_IO_URL}/profile/${parseAddress(
					battles.player.roninAddress,
					"ronin"
			  )}/battles)`
			: "Player"
		return new EmbedBuilder()
			.setDescription(`${playerName}`)
			.addFields({
				name: translate("wins"),
				value: `**${battles.win_total}** (${battles.win_rate}%)`,
				inline: true,
			})
			.addFields({
				name: translate("draws"),
				value: `**${battles.draw_total}** (${battles.draw_rate}%)`,
				inline: true,
			})
			.addFields({
				name: translate("losses"),
				value: `**${battles.lose_total}** (${battles.lose_rate}%)`,
				inline: true,
			})
			.addFields({
				name: translate("last_used"),
				value: parseTeamURL(battles.last_used_team),
				inline: true,
			})
			.addFields({
				name: translate("total_battles"),
				value: `**${battles.match_total}**`,
				inline: true,
			})
			.addFields({
				name: translate("most_used"),
				value: parseTeamURL(battles.most_used_team),
				inline: true,
			})
			.setColor("Random")
			.setImage("attachment://teams.png")
	}

	async function createBattleEmbed(battle: ParsedArenaBattle): Promise<EmbedBuilder> {
		const opponentProfile = await getPlayerProfile(battle.opponent.userId)

		if (opponentProfile && !isAPIError(opponentProfile)) {
			battle.opponent.profile = opponentProfile
		}

		const playerIdentifier = battle.player.profile
			? `[${emojis.axies_io} ${battle.player.profile.name}](${battle.player.profile.url.axies_io})`
			: `[${emojis.axies_io} Player's Recent Battle}](${AXIES_IO_URL}/profile/${parseAddress(battle.player.userId)})`

		const opponentIdentifier = battle.opponent.profile
			? `[${battle.opponent.profile.name}](${MARKETPLACE_URL}/profile/${parseAddress(
					battle.opponent.profile.roninAddress,
					"ronin"
			  )})`
			: `${battle.opponent.userId}`

		let rewardsValue = `${battle.player.rewards?.old_vstar} ➡ ${battle.player.rewards?.new_vstar}`
		rewardsValue += `\n${battle.player.rewards?.vstar_gained} ${emojis.victory_star}`

		if (battle.result === "Victory") {
			rewardsValue += `\n${battle.player.rewards?.slp_gained} ${emojis.tokens.slp}`
			rewardsValue += `\n${battle.player.rewards?.moonshard_gained} ${emojis.moonshard}`
		}

		let battleInitiator = ""
		if (battle.rps_winner) {
			battleInitiator += `\n`
			battleInitiator += translate("battle_initiator", {
				context: battle.rps_winner === battle.player.userId ? "player" : "opponent",
			})
		}

		return new EmbedBuilder()
			.setDescription(playerIdentifier + battleInitiator)
			.addFields({
				name: translate("watch_field.name"),
				value: translate("watch_field.value", {
					battle_uuid: battle.battle_uuid,
					userId: battle.player.userId,
				}),
				inline: true,
			})
			.addFields({
				name: translate("result_field.name"),
				value: translate("result_field.value", { result: battle.result }),
				inline: true,
			})
			.addFields({
				name: translate("opponent_field"),
				value: opponentIdentifier,
				inline: true,
			})
			.addFields({
				name: translate("player_team_field"),
				value: parseTeamURL(battle.player.fighters),
				inline: true,
			})
			.addFields({
				name: translate("rewards_field"),
				value: rewardsValue,
				inline: true,
			})
			.addFields({
				name: translate("opponent_team_field"),
				value: parseTeamURL(battle.opponent.fighters),
				inline: true,
			})
			.setImage(`attachment://battle.png`)
			.setTimestamp(battle.ended_time * 1000)
			.setColor("Random")
	}

	function parseTeamURL(fighters: [Fighter, Fighter, Fighter]) {
		return fighters
			.map((fighter) => {
				if (fighter.axie_type === "starter") {
					return translate("starter_name", { starterId: fighter.axie_id })
				}

				return `[${fighter.axie_id}](${MARKETPLACE_URL}/marketplace/axies/${fighter.axie_id})`
			})
			.join("\n")
	}

	function createBattleSelection(arenaBattles: ParsedArenaBattle[], currentIndex: number = 0) {
		arenaBattles = createDynamicSelection(arenaBattles, currentIndex)

		const menuOptions: APISelectMenuOption[] = arenaBattles.map((battle) => {
			const battleTime = dayjs(battle.ended_time * 1000)
			const oneDayAgo = dayjs().subtract(1, "day")

			const timestamp = battleTime.isBefore(oneDayAgo) ? battleTime.format("LLLL") + "UTC" : battleTime.fromNow()
			const format_vstar_gained =
				(battle.player.rewards!.vstar_gained <= 0 ? "" : "+") + battle.player.rewards!.vstar_gained
			const parsed_slp_gained = (battle.player.rewards!.slp_gained <= 0 ? "" : "+") + battle.player.rewards!.slp_gained
			const parsed_moonshard_gained =
				(battle.player.rewards!.moonshard_gained <= 0 ? "" : "+") + battle.player.rewards!.moonshard_gained

			let rowLabel = `${battle.battleIndex + 1}.`
			rowLabel += ` ${translate(`results.${battle.result}`)}`
			rowLabel += ` | ${format_vstar_gained} V.Star`

			if (battle.result === "Victory") {
				rowLabel += ` | ${parsed_slp_gained} SLP`
				rowLabel += ` | ${parsed_moonshard_gained} M.Shards`
			}

			const parsedBattleType = {
				pvp: translate("friendly_pvp"),
				ranked_pvp: translate("ranked_pvp"),
				practice_pvb: translate("practice_pvb"),
				practice_pvp: translate("practice_pvp"),
				blitz_pvp: translate("blitz"),
			}

			return {
				label: rowLabel,
				description: `${parsedBattleType[battle.battle_type_string] || translate("unknown")} | ${timestamp}`,
				value: battle.battle_uuid,
				emoji: { name: battle.result_emoji },
			}
		})

		return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder().setCustomId("selected-battle").addOptions(menuOptions)
		)
	}
}

export default command
