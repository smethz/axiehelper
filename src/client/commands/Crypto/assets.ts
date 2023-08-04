import { getAssets, ParsedTokenBalances } from "@apis/chain/getAssets"
import autocomplete from "@client/components/autocomplete"
import { createErrorEmbed, sendInvalidRoninAddressError, sendNoSavedProfilesError } from "@client/components/embeds"
import { createProfileSelectMenu } from "@client/components/selection"
import { DEFAULT_IDLE_TIME } from "@constants/index"
import emojis from "@constants/props/emojis.json"
import { RONINCHAIN_URL } from "@constants/url"
import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { RoninAddress } from "@custom-types/common"
import { componentFilter } from "@utils/componentFilter"
import { disableComponents } from "@utils/componentsToggler"
import { getUser } from "@utils/dbFunctions"
import { isAPIError } from "@utils/isAPIError"
import { parseAddress } from "@utils/parsers"
import { resolveProfile } from "@utils/resolveProfile"
import { isValidRoninAddress } from "@utils/validateAddress"
import {
	ApplicationCommandOptionType,
	ComponentType,
	EmbedBuilder,
	PermissionsBitField,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js"

const config: RESTPostAPIChatInputApplicationCommandsJSONBody = {
	name: "assets",
	description: "Get the assets of a user",
	options: [
		{
			type: ApplicationCommandOptionType.User,
			name: "user",
			description: "Get the assets of the specified Discord User",
			required: false,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "id",
			description: "Get the assets of the specified Ronin Address",
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
	category: "Crypto",
	execute,
	autocomplete,
}

async function execute({ interaction, translate }: CommandExecuteParams): Promise<void> {
	await interaction.deferReply()

	const specifiedAddress = interaction.options.getString("id")
		? interaction.options.getString("id")?.toLowerCase()
		: undefined
	const specifiedUser = interaction.options.getMember("user") ?? interaction.user

	const requestFailedEmbed = createErrorEmbed({
		title: translate("errors.request_failed.title"),
		description: translate("errors.request_failed.description"),
	})

	const noAssetsEmbed = createErrorEmbed({
		title: translate("errors.no_assets.title"),
		description: translate("errors.no_assets.description"),
	})

	// -----------------------------------------------------------------------------
	// --------------------------- ADDRESS SPECIFIED -------------------------------
	// -----------------------------------------------------------------------------
	if (specifiedAddress) {
		if (!isValidRoninAddress(specifiedAddress)) {
			await sendInvalidRoninAddressError(interaction)
			return
		}

		const userAssets = await getAssets(specifiedAddress)

		if (!userAssets || isAPIError(userAssets)) {
			await interaction
				.editReply({
					embeds: [!userAssets ? noAssetsEmbed : requestFailedEmbed],
				})
				.catch(() => {})
			return
		}

		let userProfile = await resolveProfile(specifiedAddress)

		if (isAPIError(userProfile)) userProfile = undefined

		const assetsEmbed = createAssetsEmbed(userAssets, specifiedAddress)

		await interaction.editReply({ embeds: [assetsEmbed] }).catch(() => {})
		return
	}

	// -----------------------------------------------------------------------------
	// ------------------------------- USER SPECIFIED ------------------------------
	// -----------------------------------------------------------------------------
	const dbUser = await getUser(specifiedUser.id)

	// Error: No Saved Profiles
	if (!dbUser?.savedProfiles?.length) {
		await sendNoSavedProfilesError(interaction, specifiedUser.id)
		return
	}

	let userAssets = await getAssets(dbUser.savedProfiles[0]!.profile.roninAddress)

	// Error: API Error or Ronin Address has no Assets
	if (!userAssets || isAPIError(userAssets)) {
		await interaction
			.editReply({
				embeds: [!userAssets ? noAssetsEmbed : requestFailedEmbed],
			})
			.catch(() => {})

		return
	}

	// Fetch Name
	let userProfile = await resolveProfile(dbUser.savedProfiles[0]!.profileId)

	if (isAPIError(userProfile)) userProfile = undefined

	const assetsEmbed = createAssetsEmbed(userAssets, dbUser.savedProfiles[0]?.profileId!)

	if (dbUser.savedProfiles.length === 1) {
		await interaction.editReply({ embeds: [assetsEmbed] }).catch(() => {})
		return
	}

	let profileSelector = createProfileSelectMenu(dbUser.savedProfiles)

	const message = await interaction.editReply({
		embeds: [assetsEmbed],
		components: [profileSelector],
	})

	const collector = message.createMessageComponentCollector<ComponentType.StringSelect>({
		filter: componentFilter(interaction),
		idle: DEFAULT_IDLE_TIME,
	})

	collector.on("collect", async (componentInteraction) => {
		disableComponents(profileSelector)
		await componentInteraction.update({ components: [profileSelector] }).catch(() => {})

		const selectedProfile = dbUser.savedProfiles.find(
			(profile) => profile.profileId === componentInteraction.values[0]
		)!

		userAssets = await getAssets(selectedProfile.profile.roninAddress)

		profileSelector = createProfileSelectMenu(dbUser.savedProfiles, selectedProfile)

		// Error: API Error or Ronin Address has no Assets
		if (!userAssets || isAPIError(userAssets)) {
			await interaction
				.editReply({
					embeds: [!userAssets ? requestFailedEmbed : noAssetsEmbed],
					components: [profileSelector],
				})
				.catch(() => {})

			return
		}

		let userProfile = await resolveProfile(selectedProfile.profileId)

		if (isAPIError(userProfile)) userProfile = undefined

		const assetsEmbed = createAssetsEmbed(userAssets, selectedProfile.profile.roninAddress)

		await interaction.editReply({ embeds: [assetsEmbed], components: [profileSelector] }).catch(() => {})
	})

	collector.on("end", () => {
		disableComponents(profileSelector)
		message.edit({ components: [profileSelector] }).catch(() => {})
	})
}

function createAssetsEmbed(userAssets: ParsedTokenBalances, roninAddress: RoninAddress): EmbedBuilder {
	const embedFiels = userAssets.results.map((token) => {
		return {
			name: `${token.emoji} ${token.token_name}`,
			value: `**${token.parsed_balance}** ${token.token_symbol}`,
			inline: false,
		}
	})

	return new EmbedBuilder()
		.setDescription(
			`${emojis.tokens.ron} [${roninAddress}](${RONINCHAIN_URL}/address/${parseAddress(roninAddress, "ronin")})`
		)
		.addFields(embedFiels)
		.setColor("Random")
		.setTimestamp()
}

export default command
