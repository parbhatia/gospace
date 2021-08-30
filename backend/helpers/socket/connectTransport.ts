import type { DtlsParameters } from "mediasoup/src/WebRtcTransport"
import { UserMeta } from "../../types"
import type { Socket } from "socket.io"
import type RoomFactory from "../../RoomFactory"
export default ({
   socket,
   roomFactory,
}: {
   socket: Socket
   roomFactory: RoomFactory
}) => {
   socket.on("connectTransport", async (msg, callback) => {
      const {
         userMeta,
         roomId,
         transportId,
         dtlsParameters,
         transportType,
      }: {
         userMeta: UserMeta
         roomId: string
         transportId: string
         dtlsParameters: DtlsParameters
         transportType: "consumer" | "producer"
      } = msg
      // console.log(
      //    `Peer ${userMeta.name} requests to connect transport with id ${transportId}`,
      // )
      if (roomFactory.roomExists(roomId)) {
         await roomFactory
            .getRoom(roomId)!
            .getPeer(userMeta)
            .connectTransport({ id: transportId, dtlsParameters })
         console.log(
            `Peer ${userMeta.name} ${transportType} transport connection successful with transport id ${transportId}`,
         )
         callback({ Status: "success" })
      } else {
         console.error(
            `Peer ${userMeta.name} transport connection failed with transport id ${transportId}`,
         )
         callback({ Status: "failure" })
      }
   })
}
