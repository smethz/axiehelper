import { createErrorEmbed } from "@client/components/embeds"
import {
	createPages,
	createPaginationButtons,
	getFooter,
	getPageIndex,
	handlePagination,
} from "@client/components/pagination"
import { DEFAULT_IDLE_TIME, MAX_SAVED_PROFILES } from "@constants/index"
import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { componentFilter } from "@utils/componentFilter"
import { disableComponents } from "@utils/componentsToggler"
import { getUser } from "@utils/dbFunctions"
import {
	ApplicationCommandOptionType,
	ComponentType,
	EmbedBuilder,
	PermissionsBitField,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js"

const config: RESTPostAPIChatInputApplicationCommandsJSONBody = {
	name: "view",
	description: "View the lists of saved profiles in user's account",
	options: [
		{
			type: ApplicationCommandOptionType.User,
			name: "user",
			description: "View other users saved accounts.",
			required: false,
		},
	],
}

const command: SlashCommand = {
	config,
	userPermissions: [],
	botPermissions: [PermissionsBitField.Flags.ReadMessageHistory],
	guildOnly: false,
	ownerOnly: false,
	category: "Account",
	execute,
}

async function execute({ interaction, translate }: CommandExecuteParams): Promise<void> {
	await interaction.deferReply()

	const specifiedUser = interaction.options.getMember("user")
	const userId = specifiedUser?.id ?? interaction.member.id
	const userData = await getUser(userId)

	if (!userData?.savedProfiles?.length) {
		const noProfileEmbed = createErrorEmbed({
			title: translate("errors.no_address.title"),
			description: !specifiedUser
				? translate("errors.no_address.description.self")
				: translate("errors.no_address.description.other", {
						username: specifiedUser.toString(),
				  }),
		})

		await interaction.editReply({ embeds: [noProfileEmbed] }).catch(() => {})
		return
	}

	const parsedUserAddresses = userData.savedProfiles
		.map(
			(savedProfile, index) =>
				`${index + 1}. **${savedProfile.customName || savedProfile.profile.name}** - ${savedProfile.profileId}`
		)
		.join("\n")

	const embedFooterText = translate("footer", {
		numOfSavedProfiles: userData.savedProfiles.length,
		numOfMaxProfiles: MAX_SAVED_PROFILES,
	})

	let pageIndex = 0
	let pages = createPages(parsedUserAddresses)
	const paginationButtons = createPaginationButtons({ pageIndex, maxPage: pages.length })

	const viewEmbed = new EmbedBuilder()
		.setAuthor({
			name: specifiedUser
				? translate("profile_list.other", {
						username: specifiedUser.displayName,
				  })
				: translate("profile_list.self"),
			iconURL: specifiedUser?.displayAvatarURL()!,
		})
		.setDescription(parsedUserAddresses)
		.setFooter({
			text: getFooter(pageIndex, pages, interaction.locale) + ` | ${embedFooterText}`,
		})
		.setColor("Random")

	const viewMessage = await interaction.editReply({
		embeds: [viewEmbed],
		components: [paginationButtons],
	})
	const collector = viewMessage.createMessageComponentCollector<ComponentType.Button>({
		filter: componentFilter(interaction),
		idle: DEFAULT_IDLE_TIME,
	})

	collector.on("collect", async (buttonInteraction) => {
		pageIndex = await getPageIndex(buttonInteraction, pageIndex, pages.length)

		handlePagination(buttonInteraction, paginationButtons, viewMessage, pages, pageIndex)
	})

	collector.on("end", () => {
		disableComponents(paginationButtons)
		viewMessage.edit({ components: [paginationButtons] }).catch(() => {})
	})
}

export default command
