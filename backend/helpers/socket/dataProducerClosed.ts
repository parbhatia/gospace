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
   socket.on("dataProducerClosed", async (msg) => {
      const {
         roomId,
         userMeta,
         dataProducerId,
      }: { roomId: string; userMeta: UserMeta; dataProducerId: string } = msg
      console.log(`Peer ${userMeta.name}'s data producer closed`)
      if (roomFactory.roomExists(roomId) && dataProducerId) {
         const roomOfPeer = roomFactory.getRoom(roomId)!
         await roomOfPeer
            .getPeer(userMeta)
            .handleDataProducerClosed({ dataProducerId })
      }
      console.log(`Peer ${userMeta.name}'s data producer successfully removed`)
   })
}
