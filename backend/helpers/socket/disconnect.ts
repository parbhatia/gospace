import { Socket } from "socket.io"
import RoomFactory from "../../RoomFactory"
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
