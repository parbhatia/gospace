import type { Socket } from "socket.io"
import type RoomFactory from "../../RoomFactory"
export default ({
   socket,
   roomFactory,
}: {
   socket: Socket
   roomFactory: RoomFactory
}) => {
   socket.on("disconnect", async () => {
      roomFactory.getAllRooms().forEach(async (room, roomId) => {
         await await room.removePeerWithSocket(socket)
      })
   })
}
