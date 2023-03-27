import type { LoggerOptions } from "pino"
import type { PrettyOptions } from "pino-pretty"

const options: PrettyOptions = {
	colorize: true,
	translateTime: "SYS:mmm/dd/yy hh:MM:ssTT",
	ignore: "pid,hostname",
}

const pinoConfig: LoggerOptions = {
	transport: {
		target: "pino-pretty",
		options,
	},
}

export default pinoConfig
