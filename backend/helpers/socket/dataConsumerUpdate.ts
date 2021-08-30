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
   socket.on("dataConsumerClosed", async (msg) => {
      const {
         roomId,
         userMeta,
         dataConsumerId,
         updateType,
      }: {
         roomId: string
         userMeta: UserMeta
         dataConsumerId: string
         updateType: PeerEntityUpdateType
      } = msg
      console.log(`Peer ${userMeta.name}'s data consumer updated ${updateType}`)
      if (roomFactory.roomExists(roomId) && dataConsumerId) {
         const roomOfPeer = roomFactory.getRoom(roomId)!

         await roomOfPeer.getPeer(userMeta).handleEntityUpdate({
            peerEntityType: "DataConsumer",
            peerEntityUpdateType: updateType,
            id: dataConsumerId,
         })
      }
      console.log(
         `Peer ${userMeta.name}'s data consumer successfully updated ${updateType}`,
      )
   })
}
