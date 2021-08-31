import { RtpCapabilities } from "mediasoup/lib/types"
import type Room from "../../Room"
import { UserMeta } from "../../types"
import type { Socket } from "socket.io"
import type RoomFactory from "../../RoomFactory"
import debugm from "debug"
const debug = debugm("app:requestRouterRTPCapabilities")

export default ({
   socket,
   roomFactory,
}: {
   socket: Socket
   roomFactory: RoomFactory
}) => {
   socket.on("requestRouterRTPCapabilities", async (msg, callback) => {
      try {
         //Create a room on this request
         const { roomId, userMeta }: { roomId: string; userMeta: UserMeta } =
            msg
         // debug(`Peer ${userMeta.name} requests Router RTP capabilities`)
         let room: Room | undefined
         if (!roomFactory.roomExists(roomId)) {
            // debug(`Room with id ${roomId} does not exist. Creating room`)
            room = await roomFactory.createNewRoom()
            if (!room) {
               throw new Error("Error creating room")
            }
            debug(`Created new room with id ${roomId}`)
         } else {
            room = roomFactory.getRoom(roomId)!
         }

         const routerRTPCapabilities: RtpCapabilities =
            room.getRTPCapabilities()
         if (!routerRTPCapabilities) {
            throw new Error(
               `Peer ${userMeta.name}'s request of Router RTP capabilities failed`,
            )
         } else {
            if (room.hasPeer(userMeta)) {
               //Peer exists, is probably attempting reconnection
               //Remove peer from room, but don't delete room if empty
               await room.getPeer(userMeta).reinitializePeerConnection()
            }
            //Join socket to new room
            socket.join(roomId)
            callback({
               Status: "success",
               routerRtpCapabilities: routerRTPCapabilities,
            })
         }
      } catch (e) {
         debug(e)
         callback({ Status: "failure" })
      }
   })
}
