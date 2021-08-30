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
   socket.on("addDataConsumer", async (msg, callback) => {
      const {
         userMeta,
         roomId,
         transportId,
         dataProducerId,
         appData,
      }: {
         userMeta: UserMeta
         roomId: string
         transportId: string
         dataProducerId: string
         appData: any
      } = msg
      console.log(
         `Peer ${userMeta.name} requests to add data consumer with transportId ${transportId} and producerId ${dataProducerId}`,
      )
      try {
         if (roomFactory.roomExists(roomId)) {
            const room = roomFactory.getRoom(roomId)!
            const newConsumerParams = await room
               .getPeer(userMeta)
               .addDataConsumer({
                  id: transportId,
                  dataProducerId,
                  appData,
               })
            if (!newConsumerParams) {
               throw new Error("Unable to add data consumer")
            }
            console.log(
               `New data consumer added for Peer ${userMeta.name} with id ${newConsumerParams.id}`,
            )
            callback({ Status: "success", newConsumerParams })
         } else {
            console.log(`No room with ${roomId} exists`)
         }
      } catch (e) {
         console.log(
            `Peer ${userMeta.name} request to add data consumer with transportId ${transportId} failed!`,
         )
         callback({ Status: "failure", Error: e })
      }
   })
}
