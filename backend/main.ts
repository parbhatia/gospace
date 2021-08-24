import cors from "cors"
import express from "express"

// import { createServer } from "http"
import { Server, Socket } from "socket.io"
import { serverPort } from "./config/index"
import addConsumer from "./helpers/socket/addConsumer"
import addDataConsumer from "./helpers/socket/addDataConsumer"
import addDataProducer from "./helpers/socket/addDataProducer"
import addProducer from "./helpers/socket/addProducer"
import connectTransport from "./helpers/socket/connectTransport"
import consumeExistingProducers from "./helpers/socket/consumeExistingProducers"
import consumerClosed from "./helpers/socket/consumerClosed"
import debugSocket from "./helpers/socket/debug"
import disconnect from "./helpers/socket/disconnect"
import producerClosed from "./helpers/socket/producerClosed"
import removePeer from "./helpers/socket/removePeer"
import removeRoom from "./helpers/socket/removeRoom"
import requestCreateWebRtcTransport from "./helpers/socket/requestCreateWebRtcTransport"
import requestRouterRTPCapabilities from "./helpers/socket/requestRouterRTPCapabilities"
import transportClosed from "./helpers/socket/transportClosed"
import RoomFactory from "./RoomFactory"
import { createServer as createHttpsServer } from "https"
import fs from "fs"
import path from "path"
import consumeExistingDataProducers from "./helpers/socket/consumeExistingDataProducers"
import debugm from "debug"
const debug = debugm("app:main")

const privateKey = fs.readFileSync(
   path.join(__dirname, "/certs/key.pem"),
   "utf8",
)
const certificate = fs.readFileSync(
   path.join(__dirname, "/certs/cert.pem"),
   "utf8",
)
const credentials = { key: privateKey, cert: certificate }

let io: Server
export { io }

const main = async () => {
   const app = express()
   app.use(cors)
   const server = createHttpsServer(credentials, app)
   io = new Server(server, {
      path: "/server/",
      cors: {
         origin: "*",
         methods: ["GET", "POST"],
         // credentials: false,
      },
   })
   const port: number = serverPort

   const roomFactory = await RoomFactory.init()

   // TO DO: create a status interface, which always has a "Status:" : "failure" |"success, and any other keys

   io.on("connection", async (socket: Socket) => {
      requestRouterRTPCapabilities({ socket, roomFactory })
      requestCreateWebRtcTransport({ socket, roomFactory })
      connectTransport({ socket, roomFactory })
      transportClosed({ socket, roomFactory })

      addProducer({ socket, roomFactory })
      addConsumer({ socket, roomFactory })
      producerClosed({ socket, roomFactory })
      consumerClosed({ socket, roomFactory })
      consumeExistingProducers({ socket, roomFactory })
      consumeExistingDataProducers({ socket, roomFactory })

      addDataProducer({ socket, roomFactory })
      addDataConsumer({ socket, roomFactory })

      removePeer({ socket, roomFactory })
      removeRoom({ socket, roomFactory })

      debugSocket({ socket, roomFactory })
      disconnect({ socket, roomFactory })
   })

   server.listen(port, () => {
      debug(`Server started on port ${port}`)
   })
}

export default main
