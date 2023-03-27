import { getStakedTokens } from "@apis/chain/getStakedToken"
import autocomplete from "@client/components/autocomplete"
import { createErrorEmbed, sendInvalidRoninAddressError, sendNoSavedProfilesError } from "@client/components/embeds"
import { createProfileSelectMenu, PROFILE_SELECTOR_ID } from "@client/components/selection"
import { DEFAULT_IDLE_TIME } from "@constants/index"
import emoji from "@constants/props/emojis.json"
import { RONINCHAIN_URL } from "@constants/url"
import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { RoninAddress } from "@custom-types/common"
import { StakedToken, StakedTokenPair } from "@custom-types/stakes"
import { componentFilter } from "@utils/componentFilter"
import { disableComponents, enableComponents } from "@utils/componentsToggler"
import { getUser } from "@utils/dbFunctions"
import { isValidRoninAddress } from "@utils/validateAddress"
import {
	ActionRowBuilder,
	APIMessageComponentEmoji,
	ApplicationCommandOptionType,
	ComponentType,
	EmbedBuilder,
	parseEmoji,
	PermissionsBitField,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	StringSelectMenuBuilder
} from "discord.js"

const config: RESTPostAPIChatInputApplicationCommandsJSONBody = {
	name: "stakes",
	description: "Get the staked tokens of a user",
	options: [
		{
			type: ApplicationCommandOptionType.User,
			name: "user",
			description: "Get the staked tokens of the specified Discord User",
			required: false,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "id",
			description: "Get the staked tokens of the specified Ronin Address",
			required: false,
			autocomplete: true,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "token",
			description: "Choose the token to display.",
			required: false,
			choices: [
				{
					name: "AXS Staking",
					value: "0",
				},
				{
					name: "RON-AXS Farming",
					value: "1",
				},
				{
					name: "RON-SLP Farming",
					value: "2",
				},
				{
					name: "RON-USDC Farming",
					value: "3",
				},
				{
					name: "RON-WETH Farming",
					value: "4",
				},
			],
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "currency",
			description: "Choose the currency to display. Leave empty for user's preferred currency",
			required: false,
			choices: [
				{
					name: "AUD $ - Australian Dollar",
					value: "AUD",
				},
				{
					name: "BRL R$ - Brazilian Real",
					value: "BRL",
				},
				{
					name: "CAD $ - Canadian Dollar",
					value: "CAD",
				},
				{
					name: "CZK $ - Czech Koruna",
					value: "CZK",
				},
				{
					name: "ETH Ξ - Ethereum",
					value: "ETH",
				},
				{
					name: "EUR € - Euro",
					value: "EUR",
				},
				{
					name: "IDR Rp - Indonesian Rupiah",
					value: "IDR",
				},
				{
					name: "INR ₹ - Indian Rupee",
					value: "INR",
				},
				{
					name: "JPY ¥ - Japanese Yen",
					value: "JPY",
				},
				{
					name: "KRW ₩ - South Korean won",
					value: "KRW",
				},
				{
					name: "PHP ₱ - Philippine Peso",
					value: "PHP",
				},
				{
					name: "MYR RM - Malaysian Ringgit",
					value: "MYR",
				},
				{
					name: "RUB ₽ - Russian Ruble",
					value: "MYR",
				},
				{
					name: "USD $ - United States Dollar",
					value: "USD",
				},
				{
					name: "VND ₫ - Đồng Việt Nam",
					value: "VND",
				},
			],
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
	const specifiedCurrency = interaction.options.getString("currency") ?? "USD"
	const defaultToken = interaction.options.getString("default") ?? "0"

	const noStakedTokensEmbed = createErrorEmbed({
		title: translate("errors.request_failed.title"),
		description: translate("errors.request_failed.description"),
	})

	// -----------------------------------------------------------------------------
	// --------------------------- ADDRESS SPECIFIED -------------------------------
	// -----------------------------------------------------------------------------
	if (specifiedAddress) {
		if (!isValidRoninAddress(specifiedAddress)) {
			await sendInvalidRoninAddressError(interaction)
			return
		}

		const userStakedTokens = await getStakedTokens(specifiedAddress, specifiedCurrency)

		if (!userStakedTokens) {
			await interaction.editReply({ embeds: [noStakedTokensEmbed] }).catch(() => {})
			return
		}

		let stakedToken = userStakedTokens[parseInt(defaultToken)]!
		let stakedTokenEmbed = createStakedTokenEmbed(stakedToken, specifiedAddress)
		let tokenSelector = createStakedTokenMenu(defaultToken)

		const message = await interaction.editReply({
			embeds: [stakedTokenEmbed],
			components: [tokenSelector],
		})

		const collector = message.createMessageComponentCollector<ComponentType.StringSelect>({
			filter: componentFilter(interaction),
			idle: DEFAULT_IDLE_TIME,
		})

		collector.on("collect", async (menuInteraction) => {
			await menuInteraction.deferUpdate()

			disableComponents(tokenSelector)
			await menuInteraction.editReply({ components: [tokenSelector] }).catch(() => {})

			const selectedToken = parseInt(menuInteraction.values[0]!)

			stakedToken = userStakedTokens[selectedToken]!

			stakedTokenEmbed = createStakedTokenEmbed(stakedToken, specifiedAddress)
			tokenSelector = createStakedTokenMenu(selectedToken)

			await interaction.editReply({ embeds: [stakedTokenEmbed], components: [tokenSelector] }).catch(() => {})
		})

		collector.on("end", () => {
			disableComponents(tokenSelector)
			message.edit({ components: [tokenSelector] }).catch(() => {})
		})

		return
	}

	// -----------------------------------------------------------------------------
	// ------------------------------- USER SPECIFIED ------------------------------
	// -----------------------------------------------------------------------------

	const dbUser = await getUser(specifiedUser.id)

	if (!dbUser?.savedProfiles.length) {
		await sendNoSavedProfilesError(interaction, specifiedUser.id)
		return
	}

	let selectedProfile = dbUser.savedProfiles[0]!
	let userStakedTokens = await getStakedTokens(selectedProfile.profile.roninAddress, specifiedCurrency)

	if (!userStakedTokens) {
		await interaction.editReply({ embeds: [noStakedTokensEmbed] }).catch(() => {})
		return
	}

	let stakedToken = userStakedTokens[parseInt(defaultToken)]!
	let stakedTokenEmbed = createStakedTokenEmbed(stakedToken, dbUser.savedProfiles[0]!.profile.roninAddress)
	let profileSelector = createProfileSelectMenu(dbUser.savedProfiles)
	let tokenSelector = createStakedTokenMenu(defaultToken)

	const message = await interaction.editReply({
		embeds: [stakedTokenEmbed],
		components: [tokenSelector, profileSelector],
	})

	const collector = message.createMessageComponentCollector<ComponentType.StringSelect>({
		filter: componentFilter(interaction),
		idle: DEFAULT_IDLE_TIME,
	})

	collector.on("collect", async (menuInteraction) => {
		await menuInteraction.deferUpdate()

		// Profile Change
		if (menuInteraction.customId === PROFILE_SELECTOR_ID) {
			selectedProfile = dbUser.savedProfiles.find((profile) => profile.id === menuInteraction.values[0])!

			disableComponents(tokenSelector, profileSelector)
			await menuInteraction.editReply({ components: [tokenSelector, profileSelector] }).catch(() => {})

			profileSelector = createProfileSelectMenu(dbUser.savedProfiles, selectedProfile)
			userStakedTokens = await getStakedTokens(selectedProfile.profile.roninAddress, specifiedCurrency)

			if (!userStakedTokens) {
				enableComponents(tokenSelector, profileSelector)

				await menuInteraction
					.editReply({
						embeds: [noStakedTokensEmbed],
						components: [tokenSelector, profileSelector],
					})
					.catch(() => {})
				return
			}

			stakedTokenEmbed = createStakedTokenEmbed(userStakedTokens[0], selectedProfile.profile.roninAddress)
			tokenSelector = createStakedTokenMenu()

			await menuInteraction
				.editReply({
					embeds: [stakedTokenEmbed],
					components: [tokenSelector, profileSelector],
				})
				.catch(() => {})
		}

		// Token Change
		if (menuInteraction.customId === "token-menu") {
			const selectedToken = parseInt(menuInteraction.values[0]!)
			stakedToken = userStakedTokens![selectedToken]!
			tokenSelector = createStakedTokenMenu(selectedToken)
			stakedTokenEmbed = createStakedTokenEmbed(stakedToken, selectedProfile.profile.roninAddress)

			await menuInteraction
				.editReply({
					embeds: [stakedTokenEmbed],
					components: [tokenSelector, profileSelector],
				})
				.catch(() => {})
		}
	})

	collector.on("end", () => {
		disableComponents(tokenSelector, profileSelector)
		message.edit({ components: [tokenSelector, profileSelector] }).catch(() => {})
	})

	return

	function createStakedTokenMenu(defaultToken: string | number = "0") {
		return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder().setCustomId("token-menu").addOptions([
				{
					label: translate("labels.axs"),
					value: "0",
					emoji: parseEmoji(emoji.tokens.axs) as APIMessageComponentEmoji,
					default: defaultToken == "0",
				},
				{
					label: translate("labels.ron-axs"),
					value: "1",
					emoji: parseEmoji(emoji.tokens.axs) as APIMessageComponentEmoji,
					default: defaultToken == "1",
				},
				{
					label: translate("labels.ron-slp"),
					value: "2",
					emoji: parseEmoji(emoji.tokens.slp) as APIMessageComponentEmoji,
					default: defaultToken == "2",
				},
				{
					label: translate("labels.ron-usdc"),
					value: "3",
					emoji: parseEmoji(emoji.tokens.usdc) as APIMessageComponentEmoji,
					default: defaultToken == "3",
				},
				{
					label: translate("labels.ron-weth"),
					value: "4",
					emoji: parseEmoji(emoji.tokens.ethereum) as APIMessageComponentEmoji,
					default: defaultToken == "4",
				},
			])
		)
	}

	function createStakedTokenEmbed(stakedToken: StakedToken | StakedTokenPair, roninAddress: RoninAddress) {
		const embedDescription =
			`[${stakedToken.title}](${stakedToken.url})\n` +
			`[${emoji.tokens.ron} ${roninAddress}](${RONINCHAIN_URL}/address/${roninAddress})`

		const last_claim = stakedToken.last_claim_timestamp !== 0 ? `<t:${stakedToken.last_claim_timestamp}:f>` : `---`
		const next_claim = stakedToken.next_claim_timestamp !== 86400 ? `<t:${stakedToken.next_claim_timestamp}:f>` : `---`
		const last_claim_relative =
			stakedToken.last_claim_timestamp !== 0 ? `<t:${stakedToken.last_claim_timestamp}:R>` : ``
		const next_claim_relative =
			stakedToken.next_claim_timestamp !== 86400 ? `<t:${stakedToken.next_claim_timestamp}:R>` : ``

		const totalStakedField = !isTokenPair(stakedToken)
			? `**${stakedToken.amount_staked}** ${stakedToken.stake_emoji} ${stakedToken.amount_staked_price}`
			: `**${stakedToken.amount_staked}** ${stakedToken.stake_emoji} ${stakedToken.amount_staked_price}` +
			  `\n**${stakedToken.liquidity_position_token0.toLocaleString("en-US")}** ${
					stakedToken.liquidity_position_token0_emoji
			  } ${stakedToken.liquidity_position_token0_price}` +
			  `\n**${stakedToken.liquidity_position_token1.toLocaleString("en-US")}** ${
					stakedToken.liquidity_position_token1_emoji
			  } ${stakedToken.liquidity_position_token1_price}`

		const totalValueField = !isTokenPair(stakedToken)
			? `**${stakedToken.total_staked}** ${stakedToken.stake_emoji}`
			: `${stakedToken.total_staked} ${stakedToken.stake_emoji}` +
			  `\n${stakedToken.reserve0.toLocaleString("en-US")} ${stakedToken.liquidity_position_token0_emoji}` +
			  `\n${stakedToken.reserve1.toLocaleString("en-US")} ${stakedToken.liquidity_position_token1_emoji}`

		const stakedTokenEmbed = new EmbedBuilder()
			.setDescription(embedDescription)
			.addFields([
				{
					name: translate("fields.total_staked"),
					value: totalStakedField,
					inline: true,
				},
				{
					name: translate("fields.pending_rewards"),
					value: `**${stakedToken.pending_reward}** ${stakedToken.reward_emoji} ${stakedToken.pending_reward_price}`,
					inline: true,
				},
				{
					name: translate("fields.estimated_daily_rewards"),
					value: `**${stakedToken.estimated_daily_reward}** ${stakedToken.reward_emoji} ${stakedToken.estimated_daily_reward_price}`,
					inline: true,
				},
				{
					name: translate("fields.token_total_staked"),
					value: totalValueField,
					inline: true,
				},
				{
					name: translate("fields.daily_rewards"),
					value: `${stakedToken.daily_reward.toLocaleString("en-US")} ${stakedToken.reward_emoji}`,
					inline: true,
				},
				{
					name: translate("fields.estimated_daily_rewards"),
					value: `**${stakedToken.estimated_apr}%** APR`,
					inline: true,
				},
				{
					name: translate("fields.last_claimed"),
					value: `${last_claim}\n${last_claim_relative}`,
					inline: true,
				},
				{
					name: translate("fields.next_claim"),
					value: `${next_claim}\n${next_claim_relative}`,
					inline: true,
				},
			])
			.setColor("Random")
			.setTimestamp()

		if (stakedToken.isClaimable)
			stakedTokenEmbed.addFields({
				name: translate("fields.claimable"),
				value: `[${translate("fields.claim_now")}](${stakedToken.url})`,
				inline: true,
			})

		return stakedTokenEmbed
	}
}

export default command

const isTokenPair = (stakedToken: StakedToken | StakedTokenPair): stakedToken is StakedTokenPair =>
	(stakedToken as StakedTokenPair).liquidity_position != undefined
