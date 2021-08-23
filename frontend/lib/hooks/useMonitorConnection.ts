import { Transport } from "mediasoup-client/lib/Transport"
import { useEffect, useState } from "react"
import { Socket } from "socket.io-client"

//This monitors overall healthy connection status, will give a worse case connection status
const useMonitorConnection = ({
   socket,
   consumerTransport,
}: {
   socket: Socket
   consumerTransport: Transport | null
}) => {
   const [status, setStatus] = useState<
      "disconnected" | "connected" | "failure" | "connecting"
   >("disconnected")
   useEffect(() => {
      if (socket && socket.connected && consumerTransport) {
         setStatus("connected")
      } else if (socket && socket.connected && !consumerTransport) {
         setStatus("connecting")
      } else if (socket && socket.disconnected) {
         setStatus("disconnected")
      } else {
         setStatus("disconnected")
      }
   }, [socket, consumerTransport])
   return status
}

export default useMonitorConnection
