import { ParsedPlayerBattles } from "@custom-types/battle"
import type { ChartConfiguration, ChartData } from "chart.js/auto"
import { ChartJSNodeCanvas } from "chartjs-node-canvas"
import ChartDatalabels from "chartjs-plugin-datalabels"
import dayjs from "dayjs"

const chartJSNodeCanvas = new ChartJSNodeCanvas({
	width: 800,
	height: 400,
	plugins: {
		modern: ["chartjs-plugin-datalabels"],
	},
})

export async function createVStarChartCanvas(playerBattles: ParsedPlayerBattles): Promise<Buffer> {
	const vstarList = playerBattles.battles
		.filter((battle) => battle.player.rewards?.new_vstar !== undefined && battle.battle_type_string !== "blitz_pvp")
		.filter((_, index) => (index + 1) % 2 === 0)
		.map((battle) => {
			return {
				timestamp: timestampFormatter(battle.ended_time),
				vstar: battle.player.rewards?.new_vstar!,
			}
		})
		.reverse()

	const data: ChartData<"line"> = {
		labels: vstarList.map((item) => item.timestamp),
		datasets: [
			{
				data: vstarList.map((item) => item.vstar),
				backgroundColor: "rgb(75, 192, 192)",
				borderColor: "rgb(75, 192, 192)",
				tension: 0.4,
				segment: {
					borderColor: (ctx) => (ctx.p0.parsed.y > ctx.p1.parsed.y ? "rgb(192, 75, 75)" : undefined),
				},
				pointRadius: (context) => ((context.dataIndex + 1) % 5 === 0 ? 5 : 0),
			},
		],
	}

	const configuration: ChartConfiguration<"line"> = {
		type: "line",
		data: data,
		plugins: [ChartDatalabels],
		options: {
			scales: {
				y: {
					type: "linear",
					ticks: {
						color: "white",
						font: {
							weight: "bold",
							size: 16,
						},
					},
					grid: { color: "rgba(255, 255, 255, 0.1)" },
				},
				x: {
					ticks: {
						color: "white",
						font: {
							weight: "bold",
							size: 16,
						},
					},
					grid: { color: "rgba(0, 0, 0, 0)" },
				},
			},
			plugins: {
				legend: {
					display: false,
				},
				datalabels: {
					formatter: (value, context) => {
						if ((context.dataIndex + 1) % 5 === 0) return value
						return null
					},
					align: "bottom",
					anchor: "center",
					offset: 10,
					color: "#ffffff",
					font: {
						size: 16,
						weight: "bold",
					},
				},
			},
			layout: {
				padding: {
					right: 48,
				},
			},
		},
	}

	return chartJSNodeCanvas.renderToBuffer(configuration, "image/png")
}

function timestampFormatter(timestamp: number) {
	const battleTimestamp = dayjs(timestamp * 1000)
	const oneDayAgo = dayjs().subtract(1, "day")

	return battleTimestamp.isBefore(oneDayAgo) ? battleTimestamp.format("L") : battleTimestamp.fromNow()
}
