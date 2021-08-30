import type { Socket } from "socket.io"
import { PeerEntityUpdateType, UserMeta } from "../../types"
import type RoomFactory from "../../RoomFactory"
export default ({
   socket,
   roomFactory,
}: {
   socket: Socket
   roomFactory: RoomFactory
}) => {
   socket.on("dataProducerUpdate", async (msg) => {
      const {
         roomId,
         userMeta,
         dataProducerId,
         updateType,
      }: {
         roomId: string
         userMeta: UserMeta
         dataProducerId: string
         updateType: PeerEntityUpdateType
      } = msg
      console.log(`Peer ${userMeta.name}'s data producer updated ${updateType}`)
      if (roomFactory.roomExists(roomId) && dataProducerId) {
         const roomOfPeer = roomFactory.getRoom(roomId)!

         await roomOfPeer.getPeer(userMeta).handleEntityUpdate({
            peerEntityType: "DataProducer",
            peerEntityUpdateType: updateType,
            id: dataProducerId,
         })
      }
      console.log(
         `Peer ${userMeta.name}'s data producer successfully updated ${updateType}`,
      )
   })
}
