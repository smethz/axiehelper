import { UserID } from "@custom-types/common"
import { PlayerIngameProfile as PlayerProfileIngame } from "@custom-types/profile"
import { Guild, PlayerProfile, Prisma } from "@prisma/client"
import { db } from "@services/db"
import logger from "pino-logger"

export type GuildWithLeaderboard =
	| (Guild & {
			leaderboard: PlayerProfile[]
	  })
	| null

export async function createUser(userData: Prisma.UserCreateInput) {
	return db.user
		.create({
			data: userData,
			include: {
				settings: true,
				savedProfiles: {
					include: {
						profile: true,
					},
				},
			},
		})
		.finally(async () => {
			await db.$disconnect()
		})
}

export async function deleteSavedProfile(userId: string, profileIdsToDelete: string[]) {
	await db.user
		.update({
			where: { id: userId },
			data: {
				savedProfiles: {
					deleteMany: profileIdsToDelete.map((id) => {
						return { profileId: id }
					}),
				},
			},
		})
		.finally(async () => {
			await db.$disconnect()
		})
}

export async function updateProfileName(userId: UserID, name: string) {
	const profileDb = await db.playerProfile.findFirst({
		where: {
			id: userId,
		},
	})

	if (profileDb && profileDb.name !== name) {
		await db.playerProfile
			.update({
				where: {
					id: userId,
				},
				data: {
					name: name,
				},
			})
			.finally(async () => {
				await db.$disconnect()
			})
	}
}

export async function getUser(userId: string) {
	return db.user
		.findFirst({
			where: { id: userId },
			include: {
				settings: true,
				savedProfiles: {
					include: {
						profile: true,
					},
				},
			},
		})
		.finally(async () => {
			await db.$disconnect()
		})
}

export async function getUserSettings(userId: string) {
	return db.user
		.findFirst({
			where: { id: userId },
			select: {
				settings: true,
			},
		})
		.finally(async () => {
			await db.$disconnect()
		})
}

export async function createUserWithProfile(
	userId: string,
	playerId: string,
	playerName: string,
	roninAddress: string
) {
	await db.user
		.update({
			where: {
				id: userId,
			},
			data: {
				savedProfiles: {
					create: {
						id: playerId,
						profile: {
							connectOrCreate: {
								create: {
									id: playerId,
									name: playerName,
									roninAddress,
								},
								where: {
									id: playerId,
								},
							},
						},
					},
				},
			},
		})
		.finally(async () => {
			await db.$disconnect()
		})
}

export async function createGuild(guildData: Prisma.GuildCreateInput) {
	return db.guild.create({ data: guildData, include: { settings: true, leaderboard: true } }).finally(async () => {
		await db.$disconnect()
	})
}

export async function getGuild(guildId: string) {
	return db.guild
		.findFirst({
			where: { id: guildId },
			include: {
				settings: true,
			},
		})
		.finally(async () => {
			await db.$disconnect()
		})
}

export async function getGuildLeaderboard(guildId: string): Promise<GuildWithLeaderboard> {
	return db.guild
		.findFirst({
			where: { id: guildId },
			include: {
				leaderboard: true,
			},
		})
		.finally(async () => {
			await db.$disconnect()
		})
}

export async function updateGuildLeaderboard(guildId: string, playerData: PlayerProfileIngame[]) {
	return db.guild
		.upsert({
			where: { id: guildId },
			update: {
				leaderboard: {
					connectOrCreate: playerData.map((player) => {
						return {
							where: { id: player.userID },
							create: {
								id: player.userID,
								name: player.name,
								roninAddress: player.roninAddress,
							},
						}
					}),
				},
			},
			create: {
				id: guildId,
				leaderboard: {
					connectOrCreate: playerData.map((player) => {
						return {
							where: { id: player.userID },
							create: {
								id: player.userID,
								name: player.name,
								roninAddress: player.roninAddress,
							},
						}
					}),
				},
			},
			include: {
				leaderboard: true,
			},
		})
		.finally(async () => {
			await db.$disconnect()
		})
}

export async function resetGuildLeaderboard(guildId: string) {
	return db.guild
		.update({
			where: {
				id: guildId,
			},
			data: {
				leaderboard: { set: [] },
			},
			select: {
				leaderboard: true,
			},
		})
		.finally(async () => {
			await db.$disconnect()
		})
}

export async function removePlayersFromLeaderboard(guildId: string, playerIDsToRemove: string[]) {
	return db.guild
		.update({
			where: { id: guildId },
			data: {
				leaderboard: {
					disconnect: playerIDsToRemove.map((id) => {
						return { id }
					}),
				},
			},
			select: {
				leaderboard: true,
			},
		})
		.finally(async () => {
			await db.$disconnect()
		})
}

export async function deleteGuild(guildId: string) {
	try {
		await db.guild.delete({ where: { id: guildId } }).finally(async () => await db.$disconnect())
	} catch (error) {
		logger.error(error, "Failed to delete guild")
	} finally {
		await db.$disconnect()
	}
}
