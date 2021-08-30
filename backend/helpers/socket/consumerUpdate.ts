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
   socket.on("consumerUpdate", async (msg) => {
      const {
         roomId,
         userMeta,
         consumerId,
         updateType,
      }: {
         roomId: string
         userMeta: UserMeta
         consumerId: string
         updateType: PeerEntityUpdateType
      } = msg
      console.log(`Peer ${userMeta.name}'s consumer update ${updateType}`)
      if (roomFactory.roomExists(roomId) && consumerId) {
         const roomOfPeer = roomFactory.getRoom(roomId)!
         await roomOfPeer.getPeer(userMeta).handleEntityUpdate({
            peerEntityType: "Consumer",
            peerEntityUpdateType: updateType,
            id: consumerId,
         })
      }
      console.log(
         `Peer ${userMeta.name}'s consumer successfully updated ${updateType}`,
      )
   })
}
