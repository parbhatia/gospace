import { RtpCapabilities } from "mediasoup/lib/types"
import { Socket } from "socket.io"
import RoomFactory from "../../RoomFactory"
import { UserMeta } from "../../types"
import debugm from "debug"
const debug = debugm("app:addConsumer")

export default ({
   socket,
   roomFactory,
}: {
   socket: Socket
   roomFactory: RoomFactory
}) => {
   socket.on("addConsumer", async (msg, callback) => {
      const {
         userMeta,
         roomId,
         transportId,
         producerId,
         rtpCapabilities,
         appData,
         paused,
      }: {
         userMeta: UserMeta
         roomId: string
         transportId: string
         producerId: string
         rtpCapabilities: RtpCapabilities
         appData: any
         paused: boolean | undefined
      } = msg
      // debug(
      //    `Peer ${userMeta.name} requests to add consumer with transportId ${transportId} and producerId ${producerId}`,
      // )
      try {
         if (roomFactory.roomExists(roomId)) {
            const room = roomFactory.getRoom(roomId)!
            const newConsumerParams = await room.getPeer(userMeta).addConsumer({
               id: transportId,
               producerId,
               rtpCapabilities,
               appData,
               paused,
            })
            if (!newConsumerParams) {
               throw new Error("Unable to add consumer")
            }
            debug(
               `New consumer  added for Peer ${userMeta.name} with id ${newConsumerParams.id}`,
            )
            callback({ Status: "success", newConsumerParams })
         } else {
            debug(`No room with ${roomId} exists`)
         }
      } catch (e) {
         debug(
            `Peer ${userMeta.name} request to add consumer with transportId ${transportId} failed!`,
         )
         callback({ Status: "failure", Error: e })
      }
   })
}
