import type {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	ModalSubmitInteraction,
	PermissionResolvable,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js"
import type { TOptions } from "i18next"
import type Client from "../client"

export type CommandCategory = "Account" | "Axie" | "Crypto" | "Info" | "Misc" | "Owner" | "Mod" | "Fun"

export interface SlashCommand {
	config: RESTPostAPIChatInputApplicationCommandsJSONBody
	userPermissions: PermissionResolvable[]
	botPermissions: PermissionResolvable[]
	guildOnly?: boolean
	ownerOnly: boolean
	category: CommandCategory
	execute({ interaction, client, translate }: Partial<CommandExecuteParams>): Promise<void>
	autocomplete?({ interaction, client, translate }: Partial<AutoCompleteParams>): Promise<void>
	validateModal?({ interaction, client, translate }: Partial<InteractionModalParams>): Promise<void>
}

export type AutoCompleteParams = {
	interaction: AutocompleteInteraction
	client: Client
	translate: TranslateFunction
}

export type InteractionModalParams = {
	interaction: ModalSubmitInteraction
	client: Client
	translate: TranslateFunction
}

export type CommandExecuteParams = {
	interaction: ChatInputCommandInteraction<"cached">
	client: Client
	translate: TranslateFunction
}

export type TranslateFunction = (text: string | string[], options?: TOptions) => string

export interface CommandOption {
	name: string
	description: string
	choices?: { [choice: string]: string }
	options?: { [option: string]: CommandOption }
}
