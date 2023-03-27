import "dotenv/config"
import "module-alias/register"

import Client from "@client/index"
import i18nextConfig from "@configs/i18next"
import i18next from "i18next"
import Backend from "i18next-fs-backend"

i18next.use(Backend).init(i18nextConfig)

new Client().init()
