import type { DataProducer, SctpStreamParameters } from "mediasoup/lib/types"
import type { Socket } from "socket.io"
import type RoomFactory from "../../RoomFactory"
import { UserMeta } from "../../types"
export default ({
   socket,
   roomFactory,
}: {
   socket: Socket
   roomFactory: RoomFactory
}) => {
   socket.on("addDataProducer", async (msg, callback) => {
      const {
         userMeta,
         roomId,
         transportId,
         sctpStreamParameters,
         label,
         protocol,
         appData,
      }: {
         userMeta: UserMeta
         roomId: string
         transportId: string
         sctpStreamParameters: SctpStreamParameters
         label: string
         protocol: string
         appData: any
      } = msg
      console.log(
         `Peer ${userMeta.name} requests to add data producer with transportId ${transportId}`,
      )
      try {
         if (roomFactory.roomExists(roomId)) {
            const newProducer: DataProducer | null = await roomFactory
               .getRoom(roomId)!
               .getPeer(userMeta)
               .addDataProducer({
                  id: transportId,
                  sctpStreamParameters,
                  label,
                  protocol,
                  appData,
               })
            if (!newProducer) {
               throw new Error("Invalid producer")
            }
            console.log(
               `New data producer added for Peer ${userMeta.name} with id ${newProducer.id}`,
            )
            callback({ Status: "success", id: newProducer.id })
         } else {
            console.log(`No room with ${roomId} exists`)
         }
      } catch (e) {
         callback({ Status: "failure", error: e })
         console.log(
            `Peer ${userMeta.name} request to add data producer with transportId ${transportId} failed!`,
         )
      }
   })
}
