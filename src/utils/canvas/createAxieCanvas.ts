import { Axie, Part } from "@custom-types/axie"
import { getBodyparts } from "@utils/getItemList"
import { AxieGenes } from "@utils/parsers/parseAxieGene"
import canvas from "canvas"
import { Canvas, loadImage } from "canvas-constructor/cairo"
import { createCardCanvas } from "./createCardCanvas"

const axieCanvas = new Canvas(1520, 850)

export async function createDetailedAxieCanvas(axie: Axie, parsedAxieGenes: AxieGenes) {
	const axieImg = await canvas
		.loadImage(`https://axiecdn.axieinfinity.com/axies/${axie.id}/axie/axie-full-transparent.png`)
		.catch(() => canvas.loadImage("./assets/images/unknown-axie.png"))

	const potentialPointsCrests = await Promise.all(
		Object.keys(parsedAxieGenes.potentialPoints).map((axieClass) =>
			canvas.loadImage(`./assets/images/crest/${axieClass}-crest.png`)
		)
	)

	axieCanvas.beginPath()

	axieCanvas.printImage(axieImg, -100, 50, 640, 480)

	axieCanvas.setTextFont('60px "Roboto Bk"')
	axieCanvas.setColor("#ffffff")

	let crestPositionX = 10

	let pointTextPositionX = 90
	let pointTextPositionY = 53

	const potentialPoints = Object.values(parsedAxieGenes.potentialPoints)
	potentialPointsCrests.forEach((crest, index) => {
		axieCanvas.printImage(crest, crestPositionX, 0, 70, 70)
		crestPositionX = crestPositionX + 160

		axieCanvas.printText(potentialPoints[index], pointTextPositionX, pointTextPositionY)
		pointTextPositionX = pointTextPositionX + 160
	})

	let genesPositionY = 170
	let offsetByYPixels = 55

	let dGenesPositionX = 450
	let r1GenesPositionX = 850
	let r2GenesPositionX = 1200

	let offsetByXPixels = 250
	let cardPositionX = 10
	let cardPositionY = 470

	const cardWidth = 900 * 0.275
	const cardHeight = 1350 * 0.275

	axieCanvas.setTextFont('35px "Roboto Bk"')
	axieCanvas.setColor("#ffffff")

	const cardSetImg = await createAxieCardSetCanvas(axie.parts)

	// DOMINANT TITLE
	axieCanvas.printText("D", dGenesPositionX, 120)

	// R1 TITLE
	axieCanvas.printText("R1", r1GenesPositionX, 120)

	// R2 TITLE
	axieCanvas.printText("R2", r2GenesPositionX, 120)

	for (const [index, part] of parsedAxieGenes.traits.entries()) {
		// DOMINANT PARTS
		axieCanvas.setColor(part.d.color)
		axieCanvas.printText(part.d.name, dGenesPositionX, genesPositionY)
		// R1 PARTS
		axieCanvas.setColor(part.r1.color)
		axieCanvas.printText(part.r1.name, r1GenesPositionX, genesPositionY)

		// R2 PARTS
		axieCanvas.setColor(part.r2.color)
		axieCanvas.printText(part.r2.name, r2GenesPositionX, genesPositionY)
		genesPositionY = genesPositionY + offsetByYPixels

		// CARDS
		axieCanvas.printImage(cardSetImg[index]!, cardPositionX, cardPositionY, cardWidth, cardHeight)
		cardPositionX = cardPositionX + offsetByXPixels
	}

	const buffer = axieCanvas.toBuffer()

	axieCanvas.clearRectangle()

	return buffer
}

function getCardSet(parts: Part[]) {
	const bodyParts = getBodyparts()

	return parts.map((part) => {
		return bodyParts.find((bodyPart) => part.id === bodyPart.part_id)!.originCard
	})
}

async function createAxieCardSetCanvas(parts: Part[]) {
	const cardSet = getCardSet(parts)

	const bufferPromises = cardSet.map((card) => createCardCanvas(card))
	const cardSetBuffer = await Promise.all(bufferPromises)
	const imgPromises = cardSetBuffer.map((buffer) => loadImage(buffer))

	return Promise.all(imgPromises)
}
