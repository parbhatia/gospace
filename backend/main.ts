import express from "express"
import { createServer } from "http"
import { Router, RtpCapabilities, RtpParameters } from "mediasoup/lib/types"
import { Server, Socket } from "socket.io"
import { serverPort } from "./config/index"
import Room, { allRooms, createNewRoom, roomExists } from "./Room"
import Peer from "./Peer"
import WorkerFactory from "./WorkerFactory"
import { DtlsParameters } from "mediasoup/src/WebRtcTransport"
import { UserMeta } from "./types"
import { MediaKind } from "mediasoup/lib/RtpParameters"

let io: Server
export { io }

const main = async () => {
   const app = express()
   const server = createServer(app)
   io = new Server(server, {
      path: "/server/",
   })
   const port: number = serverPort

   const workerFactory = await WorkerFactory.init()

   io.on("connection", async (socket: Socket) => {
      console.log("Socket connected! :D")

      socket.on("requestRouterRTPCapabilities", async (msg) => {
         //Create a room on this request

         console.log("Client requests Router's RTP capabilities")
         const { roomId, userMeta }: { roomId: string; userMeta: string } = msg
         let room: Room
         if (!roomExists(roomId)) {
            room = await createNewRoom(workerFactory)
         } else {
            room = allRooms.get(roomId)!
         }

         //Join socket to new room
         socket.join(roomId)

         const routerRTPCapabilities: RtpCapabilities =
            room.getRTPCapabilities()
         if (!routerRTPCapabilities) {
            throw new Error("Error requesting Router's RTP Capabilities")
         }
         socket.emit("RTPCapabilitiesPayload", routerRTPCapabilities)
      })

      socket.on("requestCreateWebRtcTransport", async (msg) => {
         console.log("Client requests Create Producer Transport")
         const { roomId, userMeta }: { userMeta: UserMeta; roomId: string } =
            msg
         if (allRooms.has(roomId)) {
            const room = allRooms.get(roomId)!
            const newPeer = await room.createPeer({ userMeta })
            //send created WebRtc transport's params to client, so client can use the params to create a Transport for communication
            socket.emit(
               "receiveWebRtcTransportParams",
               newPeer.getTransportParams(),
            )
         } else {
            throw new Error(
               "requestCreateWebRtcTransport failed. Room does not exist",
            )
         }
      })

      socket.on("connectTransport", async (msg, callback) => {
         console.log("CONNECTING TRANSPORT IN SERVER")
         const {
            userMeta,
            roomId,
            transportId,
            dtlsParameters,
         }: {
            userMeta: UserMeta
            roomId: string
            transportId: string
            dtlsParameters: DtlsParameters
         } = msg
         if (allRooms.has(roomId)) {
            allRooms
               .get(roomId)!
               .getPeer(userMeta)
               .connectTransport({ id: transportId, dtlsParameters })
            callback({ Status: "success" })
         } else {
            callback({ Status: "failure" })
         }
      })
      // socket.on("broadcast", async (msg) => {
      //    const {
      //       userMeta,
      //       roomId,
      //    }: {
      //       userMeta: UserMeta
      //       roomId: string
      //    } = msg
      //    if (allRooms.has(roomId)) {
      //       await allRooms
      //          .get(roomId)!
      //          .getPeer(userMeta)
      //          .setProducerTransport({ id: transportId, rtpParameters, kind })
      //    } else {
      //       throw new Error("addProducerTransport error")
      //    }
      // })
      socket.on("addProducerTransport", async (msg) => {
         const {
            userMeta,
            roomId,
            transportId,
            rtpParameters,
            appData,
            kind,
         }: {
            userMeta: UserMeta
            roomId: string
            transportId: string
            rtpParameters: RtpParameters
            appData: any
            kind: MediaKind
         } = msg
         if (allRooms.has(roomId)) {
            await allRooms
               .get(roomId)!
               .getPeer(userMeta)
               .setProducerTransport({ id: transportId, rtpParameters, kind })
         } else {
            throw new Error("addProducerTransport error")
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
