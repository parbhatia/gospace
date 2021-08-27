import { Transport } from "mediasoup-client/lib/Transport"
import { useEffect, useState } from "react"
import { UserMeta } from "../types"
import { Socket } from "socket.io-client"
import { Device } from "mediasoup-client"
import requestCreateWebRtcTransport from "../helpers/requestCreateWebRtcTransport"

const useProducerTransport = ({
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
   const [producerTransport, setProducerTransport] = useState<Transport | null>(
      null,
   )

   const initializeProducerTransport = async (): Promise<Transport | null> => {
      if (device) {
         const newTransport = await requestCreateWebRtcTransport({
            userMeta,
            roomId,
            socket,
            device,
            transportType: "producer",
         })
         setProducerTransport(newTransport)
         return newTransport
      }
      return null
   }

   const closeProducerTransport = () => {
      if (producerTransport && !producerTransport.closed) {
         try {
            producerTransport.close()
            setProducerTransport(null)
            socket.emit("transportUpdate", {
               userMeta,
               roomId,
               transportId: producerTransport.id,
               type: "producer",
               updateType: "close",
            })
         } catch (e) {
            console.log(
               "Couldn't close producer transport. It was probably already closed",
            )
         }
      }
   }

   //Monitor producer transport
   useEffect(() => {
      if (producerTransport && socket) {
         const pt: Transport = producerTransport
         pt.on("connect", async ({ dtlsParameters }, callback, errback) => {
            // Signal local DTLS parameters to the server side transport.
            try {
               socket.emit(
                  "connectTransport",
                  {
                     userMeta,
                     roomId,
                     transportId: pt.id,
                     dtlsParameters,
                     transportType: "producer",
                  },
                  (response: any) => {
                     if (response.Status === "success") {
                        // Tell the transport that parameters were transmitted.
                        callback()
                     } else {
                        throw new Error("Failed Producer transport connect")
                     }
                  },
               )
            } catch (error) {
               console.error("Error with transport", error)
               // Tell the transport that something was wrong.
               errback(error)
            }
         })
         pt.on("produce", async (parameters, callback, errback) => {
            // Signal parameters to the server side transport and retrieve the id of
            // the server side new producer.
            try {
               socket.emit(
                  "addProducer",
                  {
                     userMeta,
                     roomId,
                     transportId: pt.id,
                     kind: parameters.kind,
                     rtpParameters: parameters.rtpParameters,
                     appData: parameters.appData,
                  },
                  (response: any) => {
                     if (response.Status === "success") {
                        const newProducerId = response.id
                        // Tell the transport that parameters were transmitted and provide it with the
                        // server side producer's id.
                        callback({ id: newProducerId })
                     } else {
                        throw new Error("Failed Producer transport connect")
                     }
                  },
               )
            } catch (error) {
               // Tell the transport that something was wrong.
               errback(error)
            }
         })
         pt.on("producedata", async (parameters, callback, errback) => {
            // Signal parameters to the server side transport and retrieve the id of
            // the server side new producer.
            // Note: Data Producers are created using our send transport
            try {
               socket.emit(
                  "addDataProducer",
                  {
                     userMeta,
                     roomId,
                     transportId: pt.id,
                     sctpStreamParameters: parameters.sctpStreamParameters,
                     label: parameters.label,
                     protocol: parameters.protocol,
                     appData: parameters.appData,
                  },
                  (response: any) => {
                     if (response.Status === "success") {
                        const newDataProducerId = response.id
                        // Tell the transport that parameters were transmitted and provide it with the
                        // server side producer's id.
                        callback({ id: newDataProducerId })
                     } else {
                        throw new Error("Failed Data Producer connect")
                     }
                  },
               )
            } catch (error) {
               // Tell the transport that something was wrong.
               errback(error)
            }
         })

         pt.on("connectionstatechange", (state: string) => {
            switch (state) {
               case "connected":
                  break
               case "connecting":
                  break
               case "failed":
                  setErrors({ ...errors, ProducingFailed: true })
                  closeProducerTransport()
                  break
               default:
                  break
            }
         })
         pt.observer.on("close", () => {
            console.log("Producer Transport observed transport close", pt.id)
            closeProducerTransport()
         })
      }
   }, [producerTransport, socket])

   return {
      producerTransport,
      closeProducerTransport,
      initializeProducerTransport,
   }
}

export default useProducerTransport
