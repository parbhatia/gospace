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
   socket.on("transportClosed", async (msg) => {
      const {
         roomId,
         userMeta,
         transportId,
         type,
      }: {
         roomId: string
         userMeta: UserMeta
         transportId: string
         type: "producer" | "consumer"
      } = msg
      console.log(
         `Peer ${userMeta.name}'s ${type} transport closed, ${transportId}`,
      )
      if (roomFactory.roomExists(roomId) && transportId) {
         const roomOfPeer = roomFactory.getRoom(roomId)!
         if (roomOfPeer.hasPeer(userMeta)) {
            if (type === "producer") {
               await roomOfPeer
                  .getPeer(userMeta)
                  .handleProducerTransportClosed({ transportId })
            } else if (type === "consumer") {
               await roomOfPeer
                  .getPeer(userMeta)
                  .handleProducerTransportClosed({ transportId })
            }
            console.log(
               `Peer ${userMeta.name}'s ${type} transport successfully removed`,
            )
         }
      } else {
         console.error(
            `Peer ${userMeta.name}'s ${type} transport ${transportId} closure unsuccessful!`,
         )
      }
   })
}
