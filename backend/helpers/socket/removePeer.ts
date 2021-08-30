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
   socket.on("removePeer", async (msg) => {
      const { roomId, userMeta }: { roomId: string; userMeta: UserMeta } = msg
      console.log(`Peer ${userMeta.name} requests to be removed from room`)
      if (roomFactory.roomExists(roomId)) {
         const roomOfPeer = roomFactory.getRoom(roomId)!
         await roomOfPeer.removePeer(userMeta)
      }
      console.log("Peer successfully removed from room", userMeta.name)
   })
}
