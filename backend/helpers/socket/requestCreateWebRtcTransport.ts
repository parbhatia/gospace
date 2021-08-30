import { UserMeta, WebRtcTransportParams } from "../../types"
import type { Socket } from "socket.io"
import type RoomFactory from "../../RoomFactory"

export default ({
   socket,
   roomFactory,
}: {
   socket: Socket
   roomFactory: RoomFactory
}) => {
   socket.on("requestCreateWebRtcTransport", async (msg, callback) => {
      const {
         roomId,
         userMeta,
         transportType,
      }: {
         userMeta: UserMeta
         roomId: string
         transportType: "producer" | "consumer"
      } = msg
      // console.log(
      //    `Peer ${userMeta.name} requests WebRtc transport connection`,
      // )
      if (roomFactory.roomExists(roomId)) {
         const room = roomFactory.getRoom(roomId)!
         let peer
         if (!room.hasPeer(userMeta)) {
            peer = await room.createPeer({ userMeta, socket })
         } else {
            peer = room.getPeer(userMeta)
         }
         const params: WebRtcTransportParams =
            await peer.createWebRtcTransport()
         // console.log(
         //    `Peer ${userMeta.name} successfully received WebRtc transport connection`,
         // )
         //send created WebRtc transport's params to client, so client can use the params to create a Transport for communication

         callback({
            Status: "success",
            transportParams: params,
         })
      } else {
         callback({
            Status: "failure",
         })
         console.log(
            `Peer ${userMeta.name} WebRtc transport connection request failed`,
         )
      }
   })
}
