import { SPECIAL_CHAR_REGEX } from "@constants/index"
import { AXIEINFINITY_CDN_URL } from "@constants/url"
import { Card } from "@custom-types/card"
import { OriginCard } from "@custom-types/parts"
import { Canvas, loadImage } from "canvas-constructor/cairo"

const cardCanvas = new Canvas(456, 706)

export async function createCardCanvas(card: OriginCard | Card) {
	const cardId = `${card.partClass}-${card.partType}-${card.partValue.toString().padStart(2, "0")}`.toLowerCase()
	const cardBaseImage = await loadImage(
		`${AXIEINFINITY_CDN_URL}/game/origin-cards/base/origin-cards-20230308/${cardId}-00.png`
	)

	// Card Base Image
	cardCanvas.printImage(cardBaseImage, 0, 0)

	// Card Name
	cardCanvas.setTextFont('30px "ChangaOne"')
	cardCanvas.setTextAlign("left")
	cardCanvas.setColor("#FFFFFF")
	cardCanvas.printText(card.name, 175, 440, 250)

	// Card Text Description
	card.description = card.description.replace(SPECIAL_CHAR_REGEX, "")

	cardCanvas.setTextFont('20px "Work Sans"')
	cardCanvas.setTextAlign("center")
	cardCanvas.printWrappedText(card.description, 245, 550, 350)

	const cardImage = cardCanvas.toBuffer("image/png")

	cardCanvas.clearRectangle()

	return cardImage
}
