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
   socket.on("consumeExistingDataProducers", async (msg) => {
      const { roomId, userMeta }: { roomId: string; userMeta: UserMeta } = msg
      if (roomFactory.roomExists(roomId)) {
         console.log(
            "Telling peers to broadcast data producers to peer " + userMeta.id,
         )
         //this is where we broadcast stored canvas data
         //db.sendCanvasData to userMeta.id

         // after this,
         // existing peers in room need to broadcast to peer
         roomFactory
            .getRoom(roomId)!
            .getPeers()
            .forEach((p) => {
               if (p.getUserMeta().id !== userMeta.id) {
                  p.broadcastDataProducersToPeer({
                     socketId: socket.id,
                     userMeta,
                  })
               }
            })
      }
   })
}
