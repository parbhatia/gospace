import { Socket } from "socket.io"
import { UserMeta } from "../../types"
import RoomFactory from "../../RoomFactory"
export default ({
   socket,
   roomFactory,
}: {
   socket: Socket
   roomFactory: RoomFactory
}) => {
   socket.on("producerClosed", async (msg) => {
      const {
         roomId,
         userMeta,
         producerId,
      }: { roomId: string; userMeta: UserMeta; producerId: string } = msg
      console.log(`Peer ${userMeta.name}'s producer closed`)
      if (roomFactory.roomExists(roomId) && producerId) {
         const roomOfPeer = roomFactory.getRoom(roomId)!
         await roomOfPeer.getPeer(userMeta).handleProducerClosed({ producerId })
      }
      console.log(`Peer ${userMeta.name}'s producer successfully removed`)
   })
}
