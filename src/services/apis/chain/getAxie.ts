import { AxieContract } from "@services/rpc"

interface AxieDetailsFromContract {
	sireId: string
	matronId: string
	birthDate: string
	genes: {
		x: string
		y: string
	}
	genes_512: string
	breedCount: string
	level: string
}

export async function getAxieFromChain(axieId: string | number): Promise<AxieDetailsFromContract | void> {
	if (typeof axieId === "string") axieId = parseInt(axieId)

	const axie: AxieDetailsFromContract | void = await AxieContract.axie(axieId)

	if (!axie || axie.genes.x.toString() === "0") return

	const genes_x = BigInt(axie.genes.x).toString(2).padStart(256, "0")
	const genes_y = BigInt(axie.genes.y).toString(2).padStart(256, "0")
	const genes_512 = BigInt("0b" + (genes_x + genes_y)).toString(16)

	return {
		sireId: axie.sireId.toString(),
		matronId: axie.matronId.toString(),
		birthDate: axie.birthDate.toString(),
		genes: {
			x: axie.genes.x.toString(),
			y: axie.genes.y.toString(),
		},
		genes_512,
		breedCount: axie.breedCount.toString(),
		level: axie.level.toString(),
	}
}
