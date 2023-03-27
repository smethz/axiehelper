import config from "@configs/pino"
import pino from "pino"

const logger = pino(config)

export default logger
