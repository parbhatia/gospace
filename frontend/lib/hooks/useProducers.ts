import { Producer } from "mediasoup-client/lib/Producer"
import { Transport } from "mediasoup-client/lib/Transport"
import { useState } from "react"
import { Socket } from "socket.io-client"
import createMediaStream from "../helpers/createMediaStream"
import { ProducerUpdateType, TransportDataType, UserMeta } from "../types"

const useProducers = ({
   userMeta,
   roomId,
   socket,
   producerTransport,
   initializeProducerTransport,
   closeProducerTransport,
}: {
   userMeta: UserMeta
   roomId: string
   socket: Socket
   producerTransport: any
   initializeProducerTransport: any
   closeProducerTransport: any
}) => {
   const [producerContainers, setProducerContainers] = useState<
      Array<{ mediaStream: MediaStream; producer: Producer; name: string }>
   >([])
   const createProducer = async ({
      mediaConstraints,
      transportDataType,
   }: {
      mediaConstraints: MediaStreamConstraints
      transportDataType: TransportDataType
   }) => {
      return new Promise(async (resolve, reject) => {
         try {
            let transport: Transport
            if (!producerTransport) {
               const newProducerTransport = await initializeProducerTransport()
               if (newProducerTransport) {
                  transport = newProducerTransport
               } else reject("Produce transport not initialized")
            } else {
               transport = producerTransport
            }
            const stream: MediaStream = await createMediaStream(
               mediaConstraints,
            )
            const track = mediaConstraints.video
               ? stream.getVideoTracks()[0]
               : stream.getAudioTracks()[0]
            track.enabled = true

            const producer = await transport!.produce({
               appData: {
                  //specify which type of producer we are using
                  dataType: transportDataType,
               },
               track,
            })
            producer.on("trackended", () => {
               //Emitted when the audio/video track being transmitted is externally stopped
               // We're just going to stop our producer transport
               console.log("trackended")
               closeProducerTransport()
               // producer.pause()
            })

            //producer will close automatically since transport closed
            producer.on("transportclose", () => {
               console.log("Producer transport closed")
               removeProducer(producer.id)
            })

            producer.on("close", () => {
               console.log("Producer has closed")
               signalProducerUpdate(producer.id, "close")
               removeProducer(producer.id)
            })
            producer.observer.on("close", () => {
               console.log("Producer has been observed closed")
               signalProducerUpdate(producer.id, "close")
               removeProducer(producer.id)
            })

            const newProducerContainer = {
               mediaStream: stream,
               producer,
               name: "",
            }
            setProducerContainers((prevState) => [
               ...prevState,
               newProducerContainer,
            ])
            resolve(newProducerContainer)
         } catch (e) {
            reject(e)
         }
      })
   }

   const updateProducerOfType = (
      transportDataType: TransportDataType,
      updateType: ProducerUpdateType,
   ) => {
      producerContainers.forEach((c) => {
         if (c.producer.appData.dataType === transportDataType) {
            if (updateType === "pause") {
               c.producer.pause()
            } else if (updateType === "resume") {
               c.producer.resume()
            } else {
               return
            }
            signalProducerUpdate(c.producer.id, updateType)
         }
      })
   }

   const removeProducer = (producerId: string) => {
      //Media streams will close via un mount cleanup
      setProducerContainers((oldContainers) =>
         oldContainers.filter((p) => p.producer.id !== producerId),
      )
   }

   //If producer updates, notify backend to sync changes
   const signalProducerUpdate = (
      producerId: string,
      updateType: ProducerUpdateType,
   ) => {
      socket.emit("producerUpdate", {
         userMeta,
         roomId,
         producerId,
         updateType,
      })
   }

   return {
      producerContainers,
      createProducer,
      updateProducerOfType,
   }
}

export default useProducers
