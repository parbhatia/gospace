import { Device } from "mediasoup-client"
import { Transport } from "mediasoup-client/lib/Transport"
import { useState } from "react"
import { Socket } from "socket.io-client"
import { AUDIO_CONSTRAINTS, VIDEO_CONSTRAINTS } from "../../config"
import createMediaStream from "../helpers/createMediaStream"
import {
   ProducerContainer,
   ProducerUpdateType,
   TransportDataType,
   UserMeta,
} from "../types"

const useProducers = ({
   userMeta,
   roomId,
   socket,
   mediaSoupDevice,
   producerTransport,
   initializeProducerTransport,
   closeProducerTransport,
}: {
   userMeta: UserMeta
   roomId: string
   socket: Socket
   mediaSoupDevice: Device | null
   producerTransport: any
   initializeProducerTransport: any
   closeProducerTransport: any
}) => {

   const [producerContainer, setProducerContainer] =
      useState<ProducerContainer>({
         id: userMeta.id,
         name: userMeta.name,
         video: null,
         audio: null
      })

   const checkDeviceProduceCapability = (kind: "audio" | "video"): boolean => {
      if (!mediaSoupDevice || !mediaSoupDevice.canProduce(kind)) {
         console.log("Cannot produce using this device, invalid device")
         // setErrors({ ...errors, MediaError: true })
         return false
      }
      return true
   }

   const createAudioProducer = async () => {
      if (checkDeviceProduceCapability("audio")) {
         await createProducer({
            mediaConstraints: AUDIO_CONSTRAINTS,
            transportDataType: "audio",
         })
      }
   }

   const createVideoProducer = async () => {
      if (checkDeviceProduceCapability("video")) {
         await createProducer({
            mediaConstraints: VIDEO_CONSTRAINTS,
            transportDataType: "video",
         })
      }
   }


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

            const newProducerObject = {
               mediaStream: stream,
               producer,
            }

            if (producerContainer.id) {
               setProducerContainer((prevState) => ({
                  ...prevState,
                  [newProducerObject.producer.appData.dataType]: {
                     producer: newProducerObject.producer,
                     mediaStream: newProducerObject.mediaStream,
                  },
               }))
            } else {
               setProducerContainer((prevState) => ({
                  id: userMeta.id,
                  name: userMeta.name,
                  [newProducerObject.producer.appData.dataType]: {
                     producer: newProducerObject.producer,
                     mediaStream: newProducerObject.mediaStream,
                  },
               }))
            }
            resolve({ })
         } catch (e) {
            reject(e)
         }
      })
   }

   const updateProducerOfType = async (
      transportDataType: TransportDataType,
      updateType: ProducerUpdateType,
   ) => {
      const newState = Object.assign({ }, producerContainer)
      if (updateType === "pause") {
         newState[transportDataType]?.producer.pause()
      } else if (updateType === "resume") {
         newState[transportDataType]?.producer.resume()
      }
      setProducerContainer(newState)
      if (newState[transportDataType]?.producer.id) {
         const status = await signalProducerUpdate(
            newState[transportDataType]?.producer.id!,
            updateType,
         )
         return status
      } return null
   }

   const removeProducer = (producerId: string) => {
      //Media streams will close via un mount cleanup
      setProducerContainer((oldContainer: ProducerContainer) => {
         if (oldContainer.video?.producer.id === producerId) {
            return {
               ...oldContainer,
               video: null,
            }
         } else if (oldContainer.audio?.producer.id === producerId) {
            return {
               ...oldContainer,
               audio: null,
            }
         } else {
            return oldContainer
         }
      })
   }

   //If producer updates, notify backend to sync changes
   const signalProducerUpdate = (
      producerId: string,
      updateType: ProducerUpdateType,
   ): Promise<boolean | null | undefined> =>
      new Promise((resolve) =>
         socket.emit(
            "producerUpdate",
            {
               userMeta,
               roomId,
               producerId,
               updateType,
            },
            (status) => {
               resolve(status)
            },
         ),
      )

   return {
      producerContainer,
      updateProducerOfType,
      createVideoProducer,
      createAudioProducer,
   }
}

export default useProducers
