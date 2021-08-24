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
   socket.on("dataConsumerClosed", async (msg) => {
      const {
         roomId,
         userMeta,
         dataConsumerId,
      }: { roomId: string; userMeta: UserMeta; dataConsumerId: string } = msg
      console.log(`Peer ${userMeta.name}'s data consumer closed`)
      if (roomFactory.roomExists(roomId) && dataConsumerId) {
         const roomOfPeer = roomFactory.getRoom(roomId)!
         await roomOfPeer
            .getPeer(userMeta)
            .handleDataConsumerClosed({ dataConsumerId })
      }
      console.log(`Peer ${userMeta.name}'s data consumer successfully removed`)
   })
}
