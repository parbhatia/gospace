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
   const [connected, setConnected] = useState(false)
   useEffect(() => {
      if (socket && consumerTransport) {
         setConnected(true)
      } else {
         setConnected(false)
      }
   }, [socket, consumerTransport])
   return connected
}

export default useMonitorConnection
