import type { Socket } from "socket.io"
import type Room from "../Room"

const sendRoomUpdate = async ({
   socket,
   room,
}: {
   socket: Socket
   room: Room
}) => {
   const roomInfo = await room.getRoomInfoForClient()
   socket.emit("roomUpdate", roomInfo)
}

export default sendRoomUpdate
