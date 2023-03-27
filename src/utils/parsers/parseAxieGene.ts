import classProps from "@constants/props/axie-class-props.json"
import { AxieGene, HexType } from "agp-npm"
import { Part, PartGene } from "agp-npm/dist/models/part"

interface PotentialPoints {
	beast?: number
	aquatic?: number
	plant?: number
	bug?: number
	bird?: number
	reptile?: number
	mech?: number
	dawn?: number
	dusk?: number
}

export function parseAxieGenes(axieGene: string) {
	return new AxieGenes(axieGene, HexType.Bit512)
}

interface ParsedPart extends Part {
	d: ExtendedPartGene
	r1: ExtendedPartGene
	r2: ExtendedPartGene
	mystic: boolean
}

interface ExtendedPartGene extends PartGene {
	color: string
}

export class AxieGenes extends AxieGene {
	constructor(hex: string, hexType?: HexType) {
		super(hex, hexType)
	}

	get traits(): ParsedPart[] {
		const traits = [this.back, this.ears, this.eyes, this.horn, this.mouth, this.tail] as ParsedPart[]

		for (const [index] of traits.entries()) {
			for (const gene of ["d", "r1", "r2"]) {
				// @ts-ignore
				const partGene = traits[index][gene]
				partGene.color = classProps[partGene.cls.toLowerCase() as keyof typeof classProps].color
			}
		}

		return traits
	}

	get quality(): number {
		const probabilities = { d: 0.375, r1: 0.09375, r2: 0.03125 }
		const maxQuality = 6 * (probabilities.d + probabilities.r1 + probabilities.r2)
		let quality = 0
		for (const part of this.traits) {
			if (part.d.cls == this.cls) {
				quality += probabilities.d
			}
			if (part.r1.cls == this.cls) {
				quality += probabilities.r1
			}
			if (part.r2.cls == this.cls) {
				quality += probabilities.r2
			}
		}

		quality = Math.round((quality / maxQuality) * 100)
		return quality
	}

	get purity(): number {
		let purity = 0
		for (const part of this.traits) {
			if (part.d.cls == this.cls) purity++
		}

		return purity
	}

	// https://support.axieinfinity.com/hc/en-us/articles/4604560594331-Potential-Points-Guide
	get potentialPoints(): PotentialPoints {
		let potentialPoints: PotentialPoints = {}

		potentialPoints[this.cls] = 3

		for (const part of this.traits) {
			const partClass = part.d.cls
			potentialPoints[partClass] = (potentialPoints[partClass] || 0) + 2
		}

		return potentialPoints
	}
}
