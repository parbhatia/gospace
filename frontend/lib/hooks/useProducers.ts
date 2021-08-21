import { Device } from "mediasoup-client"
import { Producer } from "mediasoup-client/lib/Producer"
import { Transport } from "mediasoup-client/lib/Transport"
import { useState, useCallback } from "react"
import { Socket } from "socket.io-client"
import createMediaStream from "../helpers/createMediaStream"
import { UserMeta } from "../types"

const useProducers = ({
   userMeta,
   roomId,
   socket,
   producerTransport,
   initializeProducerTransport,
   closeProducerTransport,
   initConsumeMedia,
}: {
   userMeta: UserMeta
   roomId: string
   socket: Socket
   producerTransport: any
   initializeProducerTransport: any
   closeProducerTransport: any
   initConsumeMedia: any
}) => {
   const [producerContainers, setProducerContainers] = useState<
      Array<{ mediaStream: MediaStream; producer: Producer; name: string }>
   >([])
   const createProducer = async (mediaConstraints: MediaStreamConstraints) => {
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
            const track = stream.getVideoTracks()[0]

            const producer = await transport!.produce({
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
               removeProducer(producer.id)
            })
            producer.observer.on("close", () => {
               console.log("Producer has been observed closed")
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

   const removeProducer = (producerId: string) => {
      //Media streams will close via un mount cleanup
      setProducerContainers((oldContainers) =>
         oldContainers.filter((p) => p.producer.id !== producerId),
      )
   }
   //If producer closes without producer transport closing
   const signalProducerClosed = (producerId: string) => {
      socket.emit("producerClosed", {
         userMeta,
         roomId,
         producerId,
      })
      removeProducer(producerId)
   }
   //We handle not consuming our own producer in backend
   const handleNewProducer = useCallback(
      async (msg) => {
         const {
            peerId,
            peerName,
            producerId,
         }: { peerId: string; peerName: string; producerId: string } = msg
         // console.log(
         //    `Client received broadcast message for new producer ${peerName}`,
         // )
         await initConsumeMedia({ peerId, peerName, producerId })
      },
      [initConsumeMedia],
   )

   return {
      producerContainers,
      createProducer,
      handleNewProducer,
   }
}

export default useProducers