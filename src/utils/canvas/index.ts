import canvas from "canvas"

canvas.registerFont("./assets/fonts/Roboto-Black.ttf", { family: "Roboto Bk" })
canvas.registerFont("./assets/fonts/WorkSans-Regular.ttf", { family: "Work Sans" })
canvas.registerFont("./assets/fonts/Changa-One.ttf", { family: "ChangaOne" })

export * from "./createAxieCanvas"
export * from "./createBattleCanvas"
export * from "./createCardCanvas"
