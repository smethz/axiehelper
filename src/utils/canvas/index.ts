import canvas from "canvas"

canvas.registerFont("./assets/fonts/Roboto-Black.ttf", { family: "Roboto Bk" })
canvas.registerFont("./assets/fonts/WorkSans-Regular.ttf", {
	family: "Work Sans",
})
canvas.registerFont("./assets/fonts/Changa-One.ttf", { family: "ChangaOne" })

import { createDetailedAxieCanvas } from "./createAxieCanvas"
import { createAxieTeamCanvas, createBattleCanvas, createBattleStatsCanvas } from "./createBattleCanvas"
import { createCardCanvas } from "./createCardCanvas"

export { createCardCanvas, createBattleCanvas, createAxieTeamCanvas, createBattleStatsCanvas, createDetailedAxieCanvas }
