import { Fighter } from "@custom-types/battle"
import { getCharmsList, getRunesList } from "@utils/getItemList"
import canvas from "canvas"
import { Canvas, loadImage } from "canvas-constructor/cairo"

const teamCanvas = new Canvas(880, 530)
export async function createBattleStatsCanvas(
	lastUsedTeam: [Fighter, Fighter, Fighter],
	mostUsedTeam: [Fighter, Fighter, Fighter]
) {
	const [lastUsedCanvas, mostUsedCanvas] = await Promise.all([
		createAxieTeamCanvas(lastUsedTeam),
		createAxieTeamCanvas(mostUsedTeam),
	])

	teamCanvas.printImage(lastUsedCanvas.canvas, 0, 45)
	teamCanvas.printImage(mostUsedCanvas.canvas, 0, 320)

	teamCanvas.setTextFont('35px "ChangaOne"')
	teamCanvas.setTextAlign("center")
	teamCanvas.setColor("#ffffff")
	teamCanvas.printText("Last Used Team", 450, 25)
	teamCanvas.printText("Most Used Team", 450, 300)

	const buffer = teamCanvas.toBuffer("image/png")

	teamCanvas.clearRectangle()

	return buffer
}

const battleCanvas = new Canvas(880, 490)

export async function createBattleCanvas(
	playerTeam: [Fighter, Fighter, Fighter],
	opponentTeam: [Fighter, Fighter, Fighter]
) {
	const [userCanvas, enemyCanvas] = await Promise.all([
		createAxieTeamCanvas(playerTeam),
		createAxieTeamCanvas(opponentTeam),
	])

	battleCanvas.printImage(userCanvas.canvas, 0, 0)
	battleCanvas.printImage(enemyCanvas.canvas, 0, 280)

	battleCanvas.setTextFont('35px "ChangaOne"')
	battleCanvas.setTextAlign("center")
	battleCanvas.setColor("#ffffff")
	battleCanvas.printText("VS", 450, 255)

	const buffer = battleCanvas.toBuffer("image/png")
	battleCanvas.clearRectangle()
	return buffer
}

async function createFighterCanvas(axie: Fighter) {
	const charmsLoadoutImg = await createCharmsLoudoutCanvas(axie)

	let axieImg: canvas.Image

	if (axie.axie_type === "starter") {
		axieImg = await loadImage(`./assets/images/starter/starter-${axie.axie_id}.png`).catch(() =>
			loadImage("./assets/images/unknown-axie.png")
		)
	} else {
		axieImg = await loadImage(
			`https://axiecdn.axieinfinity.com/axies/${axie.axie_id}/axie/axie-full-transparent.png`
		).catch(() => loadImage("./assets/images/unknown-axie.png"))
	}

	const axieId = axie.axie_type === "starter" ? `Starter ${axie.axie_id}` : `Axie ${axie.axie_id}`

	const fighterCanvas = new Canvas(300, 260)
		.setTextFont('20px "ChangaOne"')
		.setTextAlign("center")
		.setColor("#ffffff")
		.printText(axieId, 150, 15)

		// Axie Image
		.printImage(axieImg, 30, 0, 256, 192)

		// Charms Loadout
		.printImage(charmsLoadoutImg, 0, 160)

	if (axie.runes[0]) {
		const runeImgURL = getRunesList().find((rune) => rune.item.id === axie.runes[0])?.item.imageUrl

		const runeImg = await loadImage(runeImgURL!).catch(async () => await loadImage("./assets/images/no_rune.png"))
		fighterCanvas.printImage(runeImg, 15, 25, 58, 58)
	}

	return fighterCanvas
}

export async function createAxieTeamCanvas(axieTeam: [Fighter, Fighter, Fighter]) {
	const promises = axieTeam.map((axie) => {
		return createFighterCanvas(axie)
	})

	const [firstAxieImg, secondAxieImg, thirdAxieImg] = await Promise.all(promises)

	const axieTeamCanvas = new Canvas(900, 260)
		.printImage(firstAxieImg!, 0, 0)
		.printImage(secondAxieImg!, 300, 0)
		.printImage(thirdAxieImg!, 600, 0)
		.save()

	return axieTeamCanvas
}

async function createCharmsLoudoutCanvas(axie: Fighter) {
	const promises = Object.values(axie.charms).map((charms_id) => {
		const charmImgURL = getCharmsList().find((charm) => charm.item.id === charms_id)?.item.imageUrl

		if (charmImgURL) {
			return loadImage(charmImgURL).catch(() => loadImage("./assets/images/no_charm.png"))
		}

		return loadImage("./assets/images/no_charm.png")
	})

	const runeImages = await Promise.all(promises)

	const imgHeightPixels = 45
	const imgWidthPixels = 45

	const charmsCanvas = new Canvas(50 * 6, 45)
	for (const [index, image] of runeImages.entries()) {
		const gapPixels = index == 0 ? 0 : 5

		charmsCanvas.printImage(image, imgWidthPixels * index + gapPixels, 0, imgHeightPixels, imgWidthPixels)
	}

	return charmsCanvas
}
