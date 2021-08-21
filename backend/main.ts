import cors from "cors"
import express from "express"
import { createServer } from "http"
import { MediaKind } from "mediasoup/lib/RtpParameters"
import {
   DataProducer,
   Producer,
   RtpCapabilities,
   RtpParameters,
   SctpStreamParameters,
} from "mediasoup/lib/types"
import { DtlsParameters } from "mediasoup/src/WebRtcTransport"
import { Server, Socket } from "socket.io"
import { serverPort } from "./config/index"
import Room from "./Room"
import RoomFactory from "./RoomFactory"
import { UserMeta, WebRtcTransportParams } from "./types"

let io: Server
export { io }

const main = async () => {
   const app = express()
   app.use(cors)
   const server = createServer(app)
   io = new Server(server, {
      path: "/server/",
      cors: {
         origin: "*",
         methods: ["GET", "POST"],
         credentials: false,
      },
   })
   const port: number = serverPort

   const roomFactory = await RoomFactory.init()

   // TO DO: create a status interface, which always has a "Status:" : "failure" |"success, and any other keys

   io.on("connection", async (socket: Socket) => {
      // console.log("Socket connected! :D")

      socket.on("requestRouterRTPCapabilities", async (msg, callback) => {
         //Create a room on this request
         const { roomId, userMeta }: { roomId: string; userMeta: UserMeta } =
            msg
         // console.log(`Peer ${userMeta.name} requests Router RTP capabilities`)
         let room: Room
         if (!roomFactory.roomExists(roomId)) {
            // console.log(`Room with id ${roomId} does not exist. Creating room`)
            room = await roomFactory.createNewRoom()
            console.log(`Created new room with id ${roomId}`)
         } else {
            room = roomFactory.getRoom(roomId)!
         }
         if (room.hasPeer(userMeta)) {
            //Peer exists, is probably attempting reconnection of transports
            //remove peer from room, but don't delete room if empty
            await room.removePeer(userMeta, false)
         }
         //Join socket to new room
         socket.join(roomId)

         const routerRTPCapabilities: RtpCapabilities =
            room.getRTPCapabilities()
         if (!routerRTPCapabilities) {
            console.log(
               `Peer ${userMeta.name}'s request of Router RTP capabilities failed`,
            )
            callback({ Status: "failure" })
         } else {
            callback({
               Status: "success",
               routerRtpCapabilities: routerRTPCapabilities,
            })
         }
         // socket.emit("RTPCapabilitiesPayload", routerRTPCapabilities)
      })

      socket.on("requestCreateWebRtcTransport", async (msg, callback) => {
         const {
            roomId,
            userMeta,
            transportType,
         }: {
            userMeta: UserMeta
            roomId: string
            transportType: "producer" | "consumer"
         } = msg
         // console.log(
         //    `Peer ${userMeta.name} requests WebRtc transport connection`,
         // )
         if (roomFactory.roomExists(roomId)) {
            const room = roomFactory.getRoom(roomId)!
            let peer
            if (!room.hasPeer(userMeta)) {
               peer = await room.createPeer({ userMeta, socket })
            } else {
               peer = room.getPeer(userMeta)
            }
            const params: WebRtcTransportParams =
               await peer.createWebRtcTransport()
            // console.log(
            //    `Peer ${userMeta.name} successfully received WebRtc transport connection`,
            // )
            //send created WebRtc transport's params to client, so client can use the params to create a Transport for communication
            callback({
               Status: "success",
               transportParams: params,
            })
         } else {
            callback({
               Status: "failure",
            })
            console.log(
               `Peer ${userMeta.name} WebRtc transport connection request failed`,
            )
         }
      })

      socket.on("connectTransport", async (msg, callback) => {
         const {
            userMeta,
            roomId,
            transportId,
            dtlsParameters,
            transportType,
         }: {
            userMeta: UserMeta
            roomId: string
            transportId: string
            dtlsParameters: DtlsParameters
            transportType: "consumer" | "producer"
         } = msg
         // console.log(
         //    `Peer ${userMeta.name} requests to connect transport with id ${transportId}`,
         // )
         if (roomFactory.roomExists(roomId)) {
            await roomFactory
               .getRoom(roomId)!
               .getPeer(userMeta)
               .connectTransport({ id: transportId, dtlsParameters })
            console.log(
               `Peer ${userMeta.name} ${transportType} transport connection successful with transport id ${transportId}`,
            )
            callback({ Status: "success" })
         } else {
            console.error(
               `Peer ${userMeta.name} transport connection failed with transport id ${transportId}`,
            )
            callback({ Status: "failure" })
         }
      })
      socket.on("addProducerTransport", async (msg, callback) => {
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
         console.log(
            `Peer ${userMeta.name} requests to add producer transport with transportId ${transportId}`,
         )
         try {
            if (roomFactory.roomExists(roomId)) {
               const newProducer: Producer | null = await roomFactory
                  .getRoom(roomId)!
                  .getPeer(userMeta)
                  .addProducer({
                     id: transportId,
                     rtpParameters,
                     kind,
                  })
               if (!newProducer) {
                  throw new Error("Invalid producer")
               }
               // console.log(
               //    `New producer transport added for Peer ${userMeta.name} with id ${newProducer.id}`,
               // )
               callback({ Status: "success", id: newProducer.id })
            } else {
               console.log(`No room with ${roomId} exists`)
            }
         } catch (e) {
            callback({ Status: "failure", error: e })
            console.error(
               `Peer ${userMeta.name} request to add producer transport with transportId ${transportId} failed!`,
            )
         }
      })
      socket.on("addDataProducer", async (msg, callback) => {
         const {
            userMeta,
            roomId,
            transportId,
            sctpStreamParameters,
            label,
            protocol,
         }: {
            userMeta: UserMeta
            roomId: string
            transportId: string
            sctpStreamParameters: SctpStreamParameters
            label: string
            protocol: string
         } = msg
         console.log(
            `Peer ${userMeta.name} requests to add data producer with transportId ${transportId}`,
         )
         try {
            if (roomFactory.roomExists(roomId)) {
               const newProducer: DataProducer | null = await roomFactory
                  .getRoom(roomId)!
                  .getPeer(userMeta)
                  .addDataProducer({
                     id: transportId,
                     sctpStreamParameters,
                     label,
                     protocol,
                  })
               if (!newProducer) {
                  throw new Error("Invalid producer")
               }
               console.log(
                  `New data producer added for Peer ${userMeta.name} with id ${newProducer.id}`,
               )
               callback({ Status: "success", id: newProducer.id })
            } else {
               console.log(`No room with ${roomId} exists`)
            }
         } catch (e) {
            callback({ Status: "failure", error: e })
            console.log(
               `Peer ${userMeta.name} request to add data producer with transportId ${transportId} failed!`,
            )
         }
      })
      socket.on("addConsumerTransport", async (msg, callback) => {
         const {
            userMeta,
            roomId,
            transportId,
            producerId,
            rtpCapabilities,
            appData,
            paused,
         }: {
            userMeta: UserMeta
            roomId: string
            transportId: string
            producerId: string
            rtpCapabilities: RtpCapabilities
            appData: any
            paused: boolean | undefined
         } = msg
         // console.log(
         //    `Peer ${userMeta.name} requests to add consumer with transportId ${transportId} and producerId ${producerId}`,
         // )
         try {
            if (roomFactory.roomExists(roomId)) {
               const room = roomFactory.getRoom(roomId)!
               const newConsumerParams = await room
                  .getPeer(userMeta)
                  .addConsumer({
                     id: transportId,
                     producerId,
                     rtpCapabilities,
                     appData,
                     paused,
                  })
               if (!newConsumerParams) {
                  throw new Error("Unable to add consumer transport")
               }
               console.log(
                  `New consumer  added for Peer ${userMeta.name} with id ${newConsumerParams.id}`,
               )
               callback({ Status: "success", newConsumerParams })
            } else {
               console.log(`No room with ${roomId} exists`)
            }
         } catch (e) {
            console.log(
               `Peer ${userMeta.name} request to add consumer  with transportId ${transportId} failed!`,
            )
            callback({ Status: "failure", Error: e })
         }
      })
      socket.on("addDataConsumer", async (msg, callback) => {
         const {
            userMeta,
            roomId,
            transportId,
            dataProducerId,
         }: {
            userMeta: UserMeta
            roomId: string
            transportId: string
            dataProducerId: string
         } = msg
         console.log(
            `Peer ${userMeta.name} requests to add data consumer with transportId ${transportId} and producerId ${dataProducerId}`,
         )
         try {
            if (roomFactory.roomExists(roomId)) {
               const room = roomFactory.getRoom(roomId)!
               const newConsumerParams = await room
                  .getPeer(userMeta)
                  .addDataConsumer({
                     id: transportId,
                     dataProducerId,
                  })
               if (!newConsumerParams) {
                  throw new Error("Unable to add data consumer")
               }
               console.log(
                  `New data consumer added for Peer ${userMeta.name} with id ${newConsumerParams.id}`,
               )
               callback({ Status: "success", newConsumerParams })
            } else {
               console.log(`No room with ${roomId} exists`)
            }
         } catch (e) {
            console.log(
               `Peer ${userMeta.name} request to add data consumer with transportId ${transportId} failed!`,
            )
            callback({ Status: "failure", Error: e })
         }
      })

      socket.on("producerTransportClosed", async (msg) => {
         const {
            roomId,
            userMeta,
            producerTransportId,
         }: {
            roomId: string
            userMeta: UserMeta
            producerTransportId: string
         } = msg
         console.log(`Peer ${userMeta.name}'s producer transport closed`)
         if (roomFactory.roomExists(roomId)) {
            const roomOfPeer = roomFactory.getRoom(roomId)!
            await roomOfPeer
               .getPeer(userMeta)
               .handleProducerTransportClosed({ producerTransportId })
         }
         console.log(
            `Peer ${userMeta.name}'s producer transport successfully removed`,
         )
      })
      socket.on("producerClosed", async (msg) => {
         const {
            roomId,
            userMeta,
            producerId,
         }: { roomId: string; userMeta: UserMeta; producerId: string } = msg
         console.log(`Peer ${userMeta.name}'s producer closed`)
         if (roomFactory.roomExists(roomId)) {
            const roomOfPeer = roomFactory.getRoom(roomId)!
            await roomOfPeer
               .getPeer(userMeta)
               .handleProducerClosed({ producerId })
         }
         console.log(`Peer ${userMeta.name}'s producer successfully removed`)
      })
      socket.on("consumerClosed", async (msg) => {
         const {
            roomId,
            userMeta,
            consumerId,
         }: { roomId: string; userMeta: UserMeta; consumerId: string } = msg
         console.log(`Peer ${userMeta.name}'s consumer closed`)
         if (roomFactory.roomExists(roomId)) {
            const roomOfPeer = roomFactory.getRoom(roomId)!
            await roomOfPeer
               .getPeer(userMeta)
               .handleConsumerClosed({ consumerId })
         }
         console.log(`Peer ${userMeta.name}'s producer successfully removed`)
      })
      socket.on("consumeExistingProducers", async (msg) => {
         const { roomId, userMeta }: { roomId: string; userMeta: UserMeta } =
            msg
         if (roomFactory.roomExists(roomId)) {
            console.log("Telling peers to broadcast to peer " + userMeta.id)
            // existing peers in room need to broadcast to peer
            roomFactory
               .getRoom(roomId)!
               .getPeers()
               .forEach((p) => {
                  if (p.getUserMeta().id !== userMeta.id) {
                     p.broadcastProducersToPeer({
                        socketId: socket.id,
                        userMeta,
                     })
                  }
               })
         }
      })
      socket.on("debug", async (msg) => {
         const { roomId, userMeta }: { roomId: string; userMeta: UserMeta } =
            msg
         console.log(
            "------------------------------------------------------------",
         )
         console.log(`Peer ${userMeta.name}'s debug start ---------------`)
         if (roomFactory.roomExists(roomId)) {
            const roomOfPeer = roomFactory.getRoom(roomId)!
            await roomOfPeer.debug()
            await roomOfPeer.getPeer(userMeta).debug()
         }
         console.log(`Peer ${userMeta.name}'s debug end ---------------`)
         console.log(
            "------------------------------------------------------------",
         )
      })

      socket.on("removePeer", async (msg) => {
         const { roomId, userMeta }: { roomId: string; userMeta: UserMeta } =
            msg
         console.log(`Peer ${userMeta.name} requests to be removed from room`)
         if (roomFactory.roomExists(roomId)) {
            const roomOfPeer = roomFactory.getRoom(roomId)!
            await roomOfPeer.removePeer(userMeta)
         }
         console.log("Peer successfully removed from room", userMeta.name)
      })
      //Not sure where removing room from Peer will be called yet
      socket.on("removeRoom", async (msg) => {
         const { roomId, userMeta }: { roomId: string; userMeta: UserMeta } =
            msg
         console.log(
            `Peer ${userMeta.name} requests to remove room ${roomId} from worker!", userMeta.id`,
         )
         if (roomFactory.roomExists(roomId)) {
            const roomOfPeer = roomFactory.getRoom(roomId)!
            await roomOfPeer.removeAllPeers()
            roomFactory.removeRoom(roomId)
            console.log(`Room ${roomId} successfully removed`)
         }
      })
      socket.on("disconnect", async () => {
         roomFactory.getAllRooms().forEach(async (room, roomId) => {
            await await room.removePeerWithSocket(socket)
         })
         // console.log("A user disconnected :(")
      })
   })
   server.listen(port, () => {
      console.log(`Server started on port ${port}`)
   })
}

export default main
