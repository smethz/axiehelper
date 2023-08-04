import { AXIEINFINITY_CDN_URL } from "@constants/url"
import { Card } from "@custom-types/card"
import { Canvas, loadImage } from "canvas-constructor/cairo"

const cardCanvas = new Canvas(456, 706)

const highlightedWordRegex = /(\{.*?\}|\[.*?\]|<.*?>)/g
const hightlightCharRegex = /<|>|\{|\}|\[|\]/g

// TODO Fix regex doesn't work for: <word0 word1>. word2 word3 =>
const spaceSplitRegex = /\s+(?![^<>[\]{}]*[>\]\}])/

export async function createCardCanvas(card: Card) {
	const cardId = `${card.partClass}-${card.partType}-${card.partValue.toString().padStart(2, "0")}`.toLowerCase()
	const cardBaseImage = await loadImage(
		`${AXIEINFINITY_CDN_URL}/game/origin-cards/base/origin-cards-20230726/${cardId}-00.png`
	)

	// Card Base Image
	cardCanvas.printImage(cardBaseImage, 0, 0)

	// Card Name
	cardCanvas.setTextFont('30px "ChangaOne"')
	cardCanvas.setTextAlign("left")
	cardCanvas.setColor("#FFFFFF")
	cardCanvas.printText(card.name, 175, 440, 250)

	// Card Text Description
	cardCanvas.setTextFont('bold 18px "Work Sans"')

	const wrappedDescription = wrapText(cardCanvas, card.description, 350)

	const descriptionY = 530

	for (const [lineIndex, line] of wrappedDescription.entries()) {
		const specialDescription = splitDescription(line)
		let currentLine = ""

		const parsedLine = line.replace(hightlightCharRegex, "")
		const lineWidth = cardCanvas.measureText(parsedLine).width

		const centerX = (cardCanvas.width - lineWidth) / 2
		let descriptionX = centerX + 20

		for (let word of specialDescription) {
			if (highlightedWordRegex.test(word)) {
				// highlight description
				word = word.replace(hightlightCharRegex, "")
				cardCanvas.setColor("#ffc75c")
			} else {
				cardCanvas.setColor("#FFFFFF")
			}

			const testLine = currentLine.length === 0 ? word : `${currentLine} ${word}`
			currentLine = testLine

			cardCanvas.printText(word, descriptionX, descriptionY + 22 * lineIndex)
			descriptionX += cardCanvas.measureText(word).width
		}
	}

	const cardImage = cardCanvas.toBuffer("image/png")

	cardCanvas.clearRectangle()

	return cardImage
}

function splitDescription(description: string) {
	return description.split(highlightedWordRegex).filter(Boolean)
}

function wrapText(canvas: Canvas, text: string, maxWidth: number) {
	const words = text.split(spaceSplitRegex)
	const lines = []
	let currentLine = ""

	for (const word of words) {
		const testLine = currentLine.length === 0 ? word : `${currentLine} ${word}`
		const testWidth = canvas.measureText(testLine).width

		if (testWidth > maxWidth) {
			lines.push(currentLine.trim())
			currentLine = word
		} else {
			currentLine = testLine
		}
	}

	if (currentLine.length > 0) {
		lines.push(currentLine)
	}

	return lines
}
