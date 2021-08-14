import express from "express"
import { createServer } from "http"
import { Router } from "mediasoup/src/Router"
import { Server, Socket } from "socket.io"
import { serverPort } from "./config/index"
import { WorkerFactory, Room } from "./worker"

const createWebRTCTransport = () => {}

const main = async () => {
   const app = express()
   const server = createServer(app)
   const io = new Server(server, {
      path: "/server/",
   })
   const port: number = serverPort

   const workerFactory = await new WorkerFactory()
   await workerFactory.init()

   io.on("connection", async (socket: Socket) => {
      console.log("Socket connected! :D")

      socket.on("requestRouterRTPCapabilities", async () => {
         console.log("Client requests Router's RTP capabilities")
         const newRoom = new Room({
            worker: workerFactory.getAvailableWorker(),
         })
         await newRoom.init()
         const routerRTPCapabilities = newRoom.getRTPCapabilities()
         socket.emit("RTPCapabilitiesPayload", routerRTPCapabilities)
      })

      socket.on("requestCreateProducerTransport", async () => {
         console.log("Client requests Create Producer Transport")
      })

      socket.on("disconnect", async () => {
         console.log("A user disconnected :(")
      })
   })
   server.listen(port, () => {
      console.log(`Server started on port ${port}`)
   })
}

export default main
