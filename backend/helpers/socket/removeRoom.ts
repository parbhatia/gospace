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
   //Not sure where removing room from Peer will be called yet
   socket.on("removeRoom", async (msg) => {
      const { roomId, userMeta }: { roomId: string; userMeta: UserMeta } = msg
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
}
