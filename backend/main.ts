import fs from "fs"
import path from "path"
import { serverPort } from "./config/index"
import createExpressApp from "./ExpressApp"
import RoomFactory from "./RoomFactory"
import createServer from "./Server"
import { createSocketServer, monitorSocketEvents } from "./SocketServer"
import type { HTTPSCredentials } from "./types"

const privateKey = fs.readFileSync(
   path.join(__dirname, "/certs/key.pem"),
   "utf8",
)
const certificate = fs.readFileSync(
   path.join(__dirname, "/certs/cert.pem"),
   "utf8",
)

const credentials: HTTPSCredentials = { key: privateKey, cert: certificate }
const expressApp = createExpressApp()
const server = createServer({ httpsCredentials: credentials, expressApp, port: serverPort })
export const socketServer = createSocketServer(server)


const main = async () => {
   const roomFactory = await RoomFactory.init()
   await monitorSocketEvents(socketServer, roomFactory)
}

export default main
