import express from "express"
import { createServer } from "http"
import { Router } from "mediasoup/src/Router"
import { Server, Socket } from "socket.io"
import { serverPort } from "./config/index"
import WorkerFactory from "./WorkerFactory"
import Room from "./Room"
import mediasoupConfig from "./config/mediasoup"
// import { Transport } from "mediasoup/src/Transport"
import {
   DtlsParameters,
   IceCandidate,
   IceParameters,
   WebRtcTransport,
} from "mediasoup/src/WebRtcTransport"
import { RtpCapabilities } from "mediasoup/src/RtpParameters"

//WebRtcTransport created using a Router
class Transport {
   transport: WebRtcTransport | null
   router: Router
   transportParams: {
      id: String
      iceParameters: IceParameters
      iceCandidates: Array<IceCandidate>
      dtlsParameters: DtlsParameters
   } | null
   constructor({ router }: { router: Router }) {
      this.router = router
      this.transport = null
      this.transportParams = null
   }
   init = async () => {
      const { listenIps, maxIncomingBitrate, initialAvailableOutgoingBitrate } =
         mediasoupConfig.mediasoup.webRtcTransport
      const transport: WebRtcTransport =
         await this.router.createWebRtcTransport({
            listenIps,
            initialAvailableOutgoingBitrate,
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
         })
      await transport.setMaxIncomingBitrate(maxIncomingBitrate)
      this.transport = transport
      this.transportParams = {
         id: this.transport.id,
         iceParameters: this.transport.iceParameters,
         iceCandidates: this.transport.iceCandidates,
         dtlsParameters: this.transport.dtlsParameters,
      }
   }
   getTransport = () => this.transport
   getTransportParams = () => this.transportParams
}

const allRooms: Map<string, Room> = new Map()

const roomExists = (roomId: string): boolean => {
   return allRooms.has(roomId)
}

const createNewRoom = async (workerFactory: WorkerFactory): Promise<Room> => {
   const newRoom = new Room({
      worker: workerFactory.getAvailableWorker(),
   })
   await newRoom.init()
   allRooms.set(newRoom.id, newRoom)
   return newRoom
}

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

      socket.on("requestRouterRTPCapabilities", async (msg) => {
         const roomId: string = msg
         console.log("Client requests Router's RTP capabilities")
         let room: Room
         if (!roomExists(roomId)) {
            room = await createNewRoom(workerFactory)
         } else {
            room = allRooms.get(roomId)!
         }
         const routerRTPCapabilities: RtpCapabilities | undefined =
            room.getRTPCapabilities()
         if (!routerRTPCapabilities) {
            throw new Error("Error requesting Router's RTP Capabilities")
         }
         socket.emit("RTPCapabilitiesPayload", routerRTPCapabilities)
      })

      socket.on("requestCreateProducerTransport", async (msg) => {
         console.log("Client requests Create Producer Transport")
         const roomId: string = msg
         if (allRooms.has(roomId)) {
            const router: Router = allRooms.get(roomId)?.getRouter()!
            const webRtcTransport = new Transport({ router })
         } else {
            throw new Error("Invalid create producer transport request")
         }
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
