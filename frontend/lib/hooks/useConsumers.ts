import { Device } from "mediasoup-client"
import { Consumer } from "mediasoup-client/lib/Consumer"
import { Transport } from "mediasoup-client/lib/Transport"
import { useCallback, useState } from "react"
import { Socket } from "socket.io-client"
import createMediaStreamFromTrack from "../helpers/createMediaStreamFromTrack"
import {
   ConsumerContainer, ConsumerUpdateType,
   ConsumeServerConsumeParams, UserMeta
} from "../types"

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
      Array<ConsumerContainer>
   >([])

   const initConsumeMedia = async ({
      peerId,
      peerName,
      producerId,
      appData,
   }: {
      peerId: string
      peerName: string
      producerId: string
      appData: any
   }) => {
      try {
         const newConsumerObject = await createConsumer({
            peerId,
            peerName,
            producerId,
            appData,
         })
         setConsumerContainers((prevState) => {
            //careful not to filter prevState outside of setConsumerContainers, since setConsumerContainers is asynchronous, and a rapidfire calling of initConsumeMedia, when the user first joins room and asks for producers, will mean we fail to detect existing consumers
            const peerExists = prevState.filter(
               (c: ConsumerContainer) => c.id === newConsumerObject.peerId,
            )[0]
            if (!peerExists) {
               return [
                  ...prevState,
                  {
                     id: newConsumerObject.peerId,
                     name: newConsumerObject.name,
                     [newConsumerObject.consumer.appData.dataType]: {
                        consumer: newConsumerObject.consumer,
                        mediaStream: newConsumerObject.mediaStream,
                     },
                  },
               ]
            } else {
               return (
                  prevState.map((container) => {
                     if (container.id === newConsumerObject.peerId) {
                        return {
                           ...container,
                           [newConsumerObject.consumer.appData.dataType]: {
                              consumer: newConsumerObject.consumer,
                              mediaStream: newConsumerObject.mediaStream,
                           },
                        }
                     } else {
                        return { ...container }
                     }
                  })
               )
            }
         })
      } catch (err) {
         console.error("Failed to consume media from producer", err)
         //Show failed to consume media from new producer message
      }
   }

   const createConsumer = async ({
      peerId,
      peerName,
      producerId,
      appData,
   }: {
      peerId: string
      peerName: string
      producerId: string
      appData: any
   }): Promise<{
      mediaStream: MediaStream
      consumer: Consumer
      name: string
      peerId: string
   }> => {
      return new Promise(async (resolve, reject) => {
         let transport: Transport
         if (!consumerTransport) {
            const newConsumerTransport = await initializeConsumerTransport()
            if (newConsumerTransport) {
               transport = newConsumerTransport
            } else {
               reject("Consumer transport not initialized")
               return
            }
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
               appData: appData,
               paused: false,
            },
            async (response: any) => {
               if (response.Status !== "success") {
                  reject(
                     "Failed Producer transport connect : " + response.Error,
                  )
                  return
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
                  signalConsumerUpdate(consumer.id, "close")
                  removeConsumer(consumer.id)
               })

               consumer.observer.on("close", () => {
                  signalConsumerUpdate(consumer.id, "close")
                  removeConsumer(consumer.id)
               })

               const newConsumerObject = {
                  mediaStream: stream,
                  consumer,
                  name: peerName,
                  peerId,
               }
               resolve(newConsumerObject)
            },
         )
      })
   }

   const removeConsumer = (consumerId: string) => {
      //Media streams will close via un mount cleanup
      setConsumerContainers((oldContainers) =>
         oldContainers
            .map((c) => {
               if (c.video?.consumer.id === consumerId) {
                  console.log("setting video undefined")
                  return {
                     ...c,
                     video: null,
                  }
               } else if (c.audio?.consumer.id === consumerId) {
                  console.log("setting audio undefined")
                  return {
                     ...c,
                     audio: null,
                  }
               } else {
                  return c
               }
            })
            .filter((c) => c.video !== null && c.audio !== null),
      )
   }

   const pauseConsumer = (consumerId: string) => {
      setConsumerContainers((oldState) => {
         return oldState.map((c: ConsumerContainer) => {
            if (c.video?.consumer.id === consumerId) {
               c.video.consumer.pause()
               c.video.mediaStream.getTracks()[0].enabled = false
            } else if (c.audio?.consumer.id === consumerId) {
               c.audio.consumer.pause()
               c.audio.mediaStream.getTracks()[0].enabled = false
            }
            return c
         })
      })
   }
   const resumeConsumer = (consumerId: string) => {
      setConsumerContainers((oldState) => {
         return oldState.map((c: ConsumerContainer) => {
            if (c.video?.consumer.id === consumerId) {
               c.video.consumer.resume()
               c.video.mediaStream.getTracks()[0].enabled = true
            } else if (c.audio?.consumer.id === consumerId) {
               c.audio.consumer.resume()
               c.audio.mediaStream.getTracks()[0].enabled = true
            }
            return c
         })
      })
   }

   //If consumer updates, notify backend to sync changes
   const signalConsumerUpdate = (
      consumerId: string,
      updateType: ConsumerUpdateType,
   ) => {
      socket.emit("consumerUpdate", {
         userMeta,
         roomId,
         consumerId,
         updateType,
      })
   }

   // handles update consumer request from backend
   const handleConsumerUpdate = useCallback(
      (msg) => {
         const { id, userMeta: senderMeta, updateType } = msg
         switch (updateType) {
            case "close":
               removeConsumer(id)
               break
            case "pause":
               pauseConsumer(id)
               break
            case "resume":
               resumeConsumer(id)
               break
         }
         // console.log(
         //    `Client ${userMeta.name} received close consumer request from ${senderMeta.name}`,
         // )
      },
      [consumerContainers],
   )

   return {
      consumerContainers,
      initConsumeMedia,
      handleConsumerUpdate,
   }
}

export default useConsumers
