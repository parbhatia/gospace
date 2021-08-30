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
   socket.on("transportUpdate", async (msg) => {
      const {
         roomId,
         userMeta,
         transportId,
         type,
         updateType,
      }: {
         roomId: string
         userMeta: UserMeta
         transportId: string
         type: "producer" | "consumer"
         updateType: string
      } = msg
      console.log(
         `Peer ${userMeta.name}'s ${type} transport closed, ${transportId}`,
      )
      if (roomFactory.roomExists(roomId) && transportId) {
         const roomOfPeer = roomFactory.getRoom(roomId)!
         if (roomOfPeer.hasPeer(userMeta)) {
            switch (updateType) {
               case "close":
                  switch (type) {
                     case "producer":
                        await roomOfPeer.getPeer(userMeta).handleEntityUpdate({
                           peerEntityType: "ProducerTransport",
                           peerEntityUpdateType: "close",
                           id: transportId,
                        })
                        break
                     case "consumer":
                        await roomOfPeer.getPeer(userMeta).handleEntityUpdate({
                           peerEntityType: "ConsumerTransport",
                           peerEntityUpdateType: "close",
                           id: transportId,
                        })
                        break
                     default:
                        return
                  }
                  break
               default:
                  return
            }
            console.log(
               `Peer ${userMeta.name}'s ${type} transport successfully updated ${updateType}`,
            )
         }
      } else {
         console.error(
            `Peer ${userMeta.name}'s ${type} transport ${transportId} update ${updateType} unsuccessful!`,
         )
      }
   })
}
