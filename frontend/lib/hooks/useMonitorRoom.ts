import { Transport } from "mediasoup-client/lib/Transport"
import { useCallback, useEffect, useState } from "react"
import { Socket } from "socket.io-client"
import { RoomInfo } from "../types"

const useMonitorRoom = () => {
   const [roomInfo, setRoomInfo] = useState<RoomInfo>({
      totalPeers: 0,
      name: "my-room",
      id: "my-room",
   })
   const handleRoomUpdate = useCallback(
      (msg: RoomInfo) => {
         setRoomInfo((oldRoomInfo) => ({ ...oldRoomInfo, ...msg }))
      },
      [setRoomInfo],
   )
   return {
      roomInfo,
      handleRoomUpdate,
   }
}

export default useMonitorRoom
