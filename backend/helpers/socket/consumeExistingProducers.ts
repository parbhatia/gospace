import type { Socket } from "socket.io"
import { UserMeta } from "../../types"
import type RoomFactory from "../../RoomFactory"
export default ({
   socket,
   roomFactory,
}: {
   socket: Socket
   roomFactory: RoomFactory
}) => {
   socket.on("consumeExistingProducers", async (msg) => {
      const { roomId, userMeta }: { roomId: string; userMeta: UserMeta } = msg
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
}
