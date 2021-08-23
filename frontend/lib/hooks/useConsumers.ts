import { Device } from "mediasoup-client"
import { Consumer } from "mediasoup-client/lib/Consumer"
import { Transport } from "mediasoup-client/lib/Transport"
import { useCallback, useState } from "react"
import { Socket } from "socket.io-client"
import createMediaStreamFromTrack from "../helpers/createMediaStreamFromTrack"
import { ConsumeServerConsumeParams } from "../types"
import { UserMeta } from "../types"

const useConsumers = ({
   userMeta,
   roomId,
   socket,
   consumerTransport,
   mediaSoupDevice,
   initializeConsumerTransport,
}: {
   userMeta: UserMeta
   roomId: string
   socket: Socket
   consumerTransport: any
   mediaSoupDevice: Device | null
   initializeConsumerTransport: any
}) => {
   const [consumerContainers, setConsumerContainers] = useState<
      Array<{
         mediaStream: MediaStream
         consumer: Consumer
         name: string
      }>
   >([])

   const initConsumeMedia = async ({
      peerId,
      peerName,
      producerId,
   }: {
      peerId: string
      peerName: string
      producerId: string
   }) => {
      try {
         const newConsumerContainer = await createConsumer({
            peerId,
            peerName,
            producerId,
         })

         setConsumerContainers((prevState) => [
            ...prevState,
            newConsumerContainer,
         ])
      } catch (err) {
         console.error("Failed to consume media from producer", err)
         //Show failed to consume media from new producer message
      }
   }

   const createConsumer = async ({
      peerId,
      peerName,
      producerId,
   }: {
      peerId: string
      peerName: string
      producerId: string
   }): Promise<{
      mediaStream: MediaStream
      consumer: Consumer
      name: string
      id: string
   }> => {
      return new Promise(async (resolve, reject) => {
         let transport: Transport
         if (!consumerTransport) {
            const newConsumerTransport = await initializeConsumerTransport()
            if (newConsumerTransport) {
               transport = newConsumerTransport
            } else reject("Consumer transport not initialized")
         } else if (!mediaSoupDevice) {
            reject("Mediasoup device does not exist")
         } else {
            transport = consumerTransport
         }
         const { rtpCapabilities } = mediaSoupDevice!

         socket.emit(
            "addConsumer",
            {
               userMeta,
               roomId,
               transportId: transport!.id,
               producerId,
               rtpCapabilities,
               appData: {},
               paused: false,
            },
            async (response: any) => {
               if (response.Status !== "success") {
                  reject(
                     "Failed Producer transport connect : " + response.Error,
                  )
               }
               const {
                  id,
                  kind,
                  rtpParameters,
                  producerId,
                  appData,
               }: ConsumeServerConsumeParams = response.newConsumerParams
               const consumer = await transport.consume({
                  id,
                  kind,
                  producerId,
                  rtpParameters,
                  appData,
               })
               const { track }: { track: MediaStreamTrack } = consumer
               const stream: MediaStream = await createMediaStreamFromTrack(
                  track,
               )
               // consumer.on("trackended", () => {})

               //consumer will close automatically, since transport closed
               consumer.on("transportclose", () => {
                  // console.log("Consumer transport closed")
                  // signalConsumerClosed(consumer.id)
                  removeConsumer(consumer.id)
               })

               consumer.on("close", () => {
                  removeConsumer(consumer.id)
               })

               const newConsumerContainer = {
                  mediaStream: stream,
                  consumer,
                  name: peerName,
                  id: peerId,
               }
               resolve(newConsumerContainer)
            },
         )
      })
   }

   const removeConsumer = (consumerId: string) => {
      //Media streams will close via un mount cleanup
      setConsumerContainers((oldContainers) =>
         oldContainers.filter((c) => c.consumer.id !== consumerId),
      )
   }
   //Incase Consumer closes without consumer transport being closed
   const signalConsumerClosed = (consumerId: string) => {
      socket.emit("consumerClosed", {
         userMeta,
         roomId,
         consumerId,
      })
      removeConsumer(consumerId)
   }

   // handles remove consumer request from backend
   const handleCloseConsumer = useCallback(
      (msg) => {
         const { id, userMeta: senderMeta } = msg
         // console.log(
         //    `Client ${userMeta.name} received close consumer request from ${senderMeta.name}`,
         // )
         setConsumerContainers((oldConsumerContainers) =>
            oldConsumerContainers.filter((c) => c.consumer.id !== id),
         )
      },
      [consumerContainers],
   )

   return {
      consumerContainers,
      initConsumeMedia,
      handleCloseConsumer,
   }
}

export default useConsumers
