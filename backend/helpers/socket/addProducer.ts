import type { Producer, RtpParameters } from "mediasoup/lib/types"
import type { MediaKind } from "mediasoup/lib/RtpParameters"
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
   socket.on("addProducer", async (msg, callback) => {
      const {
         userMeta,
         roomId,
         transportId,
         rtpParameters,
         appData,
         kind,
      }: {
         userMeta: UserMeta
         roomId: string
         transportId: string
         rtpParameters: RtpParameters
         appData: any
         kind: MediaKind
      } = msg
      console.log(
         `Peer ${userMeta.name} requests to add producer with transportId ${transportId}`,
      )
      try {
         if (roomFactory.roomExists(roomId)) {
            const newProducer: Producer | null = await roomFactory
               .getRoom(roomId)!
               .getPeer(userMeta)
               .addProducer({
                  id: transportId,
                  rtpParameters,
                  kind,
                  appData,
               })
            if (!newProducer) {
               throw new Error("Invalid producer")
            }
            // console.log(
            //    `New producer added for Peer ${userMeta.name} with id ${newProducer.id}`,
            // )
            callback({ Status: "success", id: newProducer.id })
         } else {
            console.log(`No room with ${roomId} exists`)
         }
      } catch (e) {
         callback({ Status: "failure", error: e })
         console.error(
            `Peer ${userMeta.name} request to add producer with transportId ${transportId} failed!`,
         )
      }
   })
}
