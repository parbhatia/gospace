import { Socket } from "socket.io"
import { UserMeta, PeerEntityUpdateType } from "../../types"
import RoomFactory from "../../RoomFactory"
export default ({
   socket,
   roomFactory,
}: {
   socket: Socket
   roomFactory: RoomFactory
}) => {
   socket.on("producerUpdate", async (msg) => {
      const {
         roomId,
         userMeta,
         producerId,
         updateType,
      }: {
         roomId: string
         userMeta: UserMeta
         producerId: string
         updateType: PeerEntityUpdateType
      } = msg
      console.log(`Peer ${userMeta.name}'s producer update ${updateType}`)
      if (roomFactory.roomExists(roomId) && producerId) {
         const roomOfPeer = roomFactory.getRoom(roomId)!
         await roomOfPeer.getPeer(userMeta).handleEntityUpdate({
            peerEntityType: "Producer",
            peerEntityUpdateType: updateType,
            id: producerId,
         })
      }
      console.log(
         `Peer ${userMeta.name}'s producer successfully updated ${updateType}`,
      )
   })
}
