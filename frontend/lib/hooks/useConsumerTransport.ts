import { Transport } from "mediasoup-client/lib/Transport"
import { useEffect, useState } from "react"
import { UserMeta } from "../types"
import { Socket } from "socket.io-client"
import { Device } from "mediasoup-client"
import requestCreateWebRtcTransport from "../helpers/requestCreateWebRtcTransport"

const useConsumerTransport = ({
   userMeta,
   roomId,
   socket,
   device,
}: {
   userMeta: UserMeta
   roomId: string
   socket: Socket
   device: Device | null
}) => {
   const [errors, setErrors] = useState({})
   const [consumerTransport, setConsumerTransport] = useState<Transport | null>(
      null,
   )

   const closeConsumerTransport = () => {
      if (consumerTransport && !consumerTransport.closed) {
         consumerTransport.close()
         setConsumerTransport(null)
         socket.emit("transportUpdate", {
            userMeta,
            roomId,
            transportId: consumerTransport.id,
            type: "consumer",
            updateType: "close",
         })
      }
   }

   const initializeConsumerTransport = async (): Promise<Transport | null> => {
      if (device) {
         const newTransport = await requestCreateWebRtcTransport({
            userMeta,
            roomId,
            socket,
            device,
            transportType: "consumer",
         })
         setConsumerTransport(newTransport)
         return newTransport
      }
      return null
   }

   //Monitor consumer transport
   useEffect(() => {
      if (consumerTransport && socket) {
         // There might already be producers in the room, by now, we have a consumer transport, so we are ready to consume such producers
         if (!consumerTransport.closed) {
            socket.emit("consumeExistingProducers", {
               roomId,
               userMeta,
            })
            socket.emit("consumeExistingDataProducers", {
               roomId,
               userMeta,
            })
         }
         const ct: Transport = consumerTransport

         ct.on("connect", async ({ dtlsParameters }, callback, errback) => {
            // Signal local DTLS parameters to the server side transport.
            try {
               socket.emit(
                  "connectTransport",
                  {
                     userMeta,
                     roomId,
                     transportId: ct.id,
                     dtlsParameters,
                     transportType: "consumer",
                  },
                  (response: any) => {
                     if (response.Status === "success") {
                        // Tell the transport that parameters were transmitted.
                        callback()
                     } else {
                        throw new Error("Failed Consumer transport connect")
                     }
                  },
               )
            } catch (error) {
               console.error("Error with transport", error)
               // Tell the transport that something was wrong.
               errback(error)
            }
         })
         ct.on("connectionstatechange", (state: string) => {
            switch (state) {
               case "connected":
                  //  socket.emit("resumeConsumerStream")
                  break
               case "connecting":
                  break
               //emit resume consumer stream object
               case "failed":
                  setErrors({ ...errors, ConsumingFailed: true })
                  closeConsumerTransport()
                  break
               default:
                  break
            }
         })
         ct.observer.on("close", () => {
            closeConsumerTransport()
            console.log("Consumer Transport observed transport close", ct.id)
         })
      }
   }, [consumerTransport, socket])

   return {
      consumerTransport,
      closeConsumerTransport,
      initializeConsumerTransport,
   }
}

export default useConsumerTransport
