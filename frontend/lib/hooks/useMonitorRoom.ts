import { useCallback, useEffect, useState } from "react"
import { RoomInfo } from "../types"
import parseMsToReadableTime from "../helpers/parseMsToReadableTime"

const ELAPSED_TIME_INTERVAL_MS = 1000

const useMonitorRoom = () => {
   const [roomInfo, setRoomInfo] = useState<RoomInfo>({
      dateCreated: "",
      totalPeers: 0,
      name: "my-room",
      id: "my-room",
   })
   const [timeElapsed, setTimeElapsed] = useState<string>()
   const handleRoomUpdate = useCallback(
      (msg: RoomInfo) => {
         setRoomInfo((oldRoomInfo) => ({ ...oldRoomInfo, ...msg }))
      },
      [setRoomInfo],
   )

   //Change elapsed time in specified interval
   useEffect(() => {
      const interval = setInterval(() => {
         if (roomInfo) {
            const newTime: any = new Date()
            const oldTime: any = new Date(roomInfo.dateCreated)
            const timeDiff: number = Math.abs(newTime - oldTime)
            const parsedElapsedTime = parseMsToReadableTime(timeDiff)
            setTimeElapsed(parsedElapsedTime)
         }
      }, ELAPSED_TIME_INTERVAL_MS)
      return () => clearInterval(interval)
   }, [roomInfo])

   return {
      roomInfo,
      handleRoomUpdate,
      timeElapsed
   }
}

export default useMonitorRoom
