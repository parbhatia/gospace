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
   socket.on("consumerClosed", async (msg) => {
      const {
         roomId,
         userMeta,
         consumerId,
      }: { roomId: string; userMeta: UserMeta; consumerId: string } = msg
      console.log(`Peer ${userMeta.name}'s consumer closed`)
      if (roomFactory.roomExists(roomId) && consumerId) {
         const roomOfPeer = roomFactory.getRoom(roomId)!
         await roomOfPeer.getPeer(userMeta).handleConsumerClosed({ consumerId })
      }
      console.log(`Peer ${userMeta.name}'s consumer successfully removed`)
   })
}
