import { RtpCapabilities } from "mediasoup/lib/types"
import Room from "../../Room"
import { UserMeta } from "../../types"
import { Socket } from "socket.io"
import RoomFactory from "../../RoomFactory"

export default ({
   socket,
   roomFactory,
}: {
   socket: Socket
   roomFactory: RoomFactory
}) => {
   socket.on("requestRouterRTPCapabilities", async (msg, callback) => {
      //Create a room on this request
      const { roomId, userMeta }: { roomId: string; userMeta: UserMeta } = msg
      // console.log(`Peer ${userMeta.name} requests Router RTP capabilities`)
      let room: Room
      if (!roomFactory.roomExists(roomId)) {
         // console.log(`Room with id ${roomId} does not exist. Creating room`)
         room = await roomFactory.createNewRoom()
         console.log(`Created new room with id ${roomId}`)
      } else {
         room = roomFactory.getRoom(roomId)!
      }

      const routerRTPCapabilities: RtpCapabilities = room.getRTPCapabilities()
      if (!routerRTPCapabilities) {
         console.log(
            `Peer ${userMeta.name}'s request of Router RTP capabilities failed`,
         )
         callback({ Status: "failure" })
      } else {
         if (room.hasPeer(userMeta)) {
            //Peer exists, is probably attempting reconnection
            //Remove peer from room, but don't delete room if empty
            await room.removePeer(userMeta, false)
            //Add peer back again
            const newPeer = await room.createPeer({ userMeta, socket })
         }
         //Join socket to new room
         socket.join(roomId)
         callback({
            Status: "success",
            routerRtpCapabilities: routerRTPCapabilities,
         })
      }
   })
}
