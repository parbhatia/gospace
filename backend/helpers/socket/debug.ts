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
   socket.on("debug", async (msg) => {
      const { roomId, userMeta }: { roomId: string; userMeta: UserMeta } = msg
      console.log(
         "------------------------------------------------------------",
      )
      console.log(`Peer ${userMeta.name}'s debug start ---------------`)
      await roomFactory.debug({ roomId })
      if (roomFactory.roomExists(roomId)) {
         const roomOfPeer = roomFactory.getRoom(roomId)!
         await roomOfPeer.debug()
         if (roomOfPeer.hasPeer(userMeta)) {
            await roomOfPeer.getPeer(userMeta).debug()
         }
      }
      console.log(`Peer ${userMeta.name}'s debug end ---------------`)
      console.log(
         "------------------------------------------------------------",
      )
   })
}
