import { Device } from "mediasoup-client"
import {
   DataConsumer,
   DataConsumerOptions,
} from "mediasoup-client/lib/DataConsumer"
import { Transport } from "mediasoup-client/lib/Transport"
import { useCallback, useState } from "react"
import { Socket } from "socket.io-client"
import {
   DataConsumerInput,
   DataConsumerUpdateType,
   DataProducerOrConsumerType,
   UserMeta,
} from "../types"

const useDataConsumers = ({
   userMeta,
   roomId,
   socket,
   consumerTransport,
   mediaSoupDevice,
   initializeConsumerTransport,
   loadToCanvas,
}: {
   userMeta: UserMeta
   roomId: string
   socket: Socket
   consumerTransport: any
   mediaSoupDevice: Device | null
   initializeConsumerTransport: any
   loadToCanvas: any
}) => {
   const [dataConsumerContainers, setDataConsumerContainers] = useState<
      Array<{
         dataConsumer: DataConsumer
         type: DataProducerOrConsumerType
      }>
   >([])

   const initDataConsume = async ({
      peerId,
      dataProducerId,
      appData,
   }: {
      peerId: string
      dataProducerId: string
      appData: any
   }) => {
      try {
         const newDataConsumerContainer = await createDataConsumer({
            type: "any",
            dataProducerId,
            appData,
         })
         setDataConsumerContainers((oldContainers) => [
            ...oldContainers,
            newDataConsumerContainer,
         ])
      } catch (err) {
         //Show failed to consume data from new data producer message
         console.error(err)
      }
   }

   const createDataConsumer = async ({
      type,
      dataProducerId,
      appData,
   }: {
      type: DataProducerOrConsumerType
      dataProducerId: string
      appData: any
   }): Promise<{
      dataConsumer: DataConsumer
      type: DataProducerOrConsumerType
   }> =>
      new Promise(async (resolve, reject) => {
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
         socket.emit(
            "addDataConsumer",
            {
               userMeta,
               roomId,
               transportId: transport!.id,
               dataProducerId,
               appData,
            },
            async (response: any) => {
               if (response.Status !== "success") {
                  throw new Error(
                     "Failed Data Consumer connect : " + response.Error,
                  )
               }
               const {
                  id,
                  sctpStreamParameters,
                  label,
                  protocol,
                  dataProducerId,
                  appData,
               }: DataConsumerOptions = response.newConsumerParams
               const dataConsumer = await transport.consumeData({
                  id,
                  dataProducerId,
                  sctpStreamParameters,
                  label,
                  protocol,
                  appData,
               })

               //data consumer will close automatically, since transport closed
               dataConsumer.on("transportclose", () => {
                  console.log("Consumer transport closed in data consumer")
                  // signalConsumerClosed(consumer.id)
                  removeDataConsumer({
                     dataConsumerType: type,
                     dataConsumerId: dataConsumer.id,
                  })
               })

               dataConsumer.on("close", () => {
                  signalDataConsumerUpdate(dataConsumer.id, "close")
                  removeDataConsumer({
                     dataConsumerType: type,
                     dataConsumerId: dataConsumer.id,
                  })
               })

               dataConsumer.on("error", async (data) => {
                  // Emitted when the underlying DataChannel fails to connect.
                  console.error("Data Consumer failed to connect", data)
               })

               dataConsumer.on("message", async (data) => {
                  if (dataConsumer.readyState === "open") {
                     //data is likely stringified json, might need to parse
                     await loadToCanvas(data)
                  }
               })
               dataConsumer.observer.on("close", () => {
                  console.log(
                     "Data Consumer has been observed closed in data producer",
                  )
                  signalDataConsumerUpdate(dataConsumer.id, "close")
                  removeDataConsumer({
                     dataConsumerType: type,
                     dataConsumerId: dataConsumer.id,
                  })
               })

               const newDataConsumerContainer = {
                  dataConsumer,
                  type,
               }

               resolve(newDataConsumerContainer)
            },
         )
      })

   // currently, data consumers on client side are closed by setting dataConsumers to null
   // in the server side, data consumers are notified via data producer close, and are closed
   // in the end, data consumers serverside and clientside are both closed, so this function is unnecessary, but nevertheless useful for flexibility 

   // handles remove data consumer request from backend
   const handleCloseDataConsumer = useCallback(
      (msg) => {
         const { id, userMeta: senderMeta } = msg
         // console.log(
         //    `Client ${userMeta.name} received close consumer request from ${senderMeta.name}`,
         // )

         removeDataConsumer({ dataConsumerType: "any", dataConsumerId: id })
      },
      [dataConsumerContainers],
   )

   const signalDataConsumerUpdate = (
      dataConsumerId: string,
      updateType: DataConsumerUpdateType,
   ) => {
      socket.emit("dataConsumerUpdate", {
         userMeta,
         roomId,
         dataConsumerId,
         updateType,
      })
   }

   const removeDataConsumer = ({
      dataConsumerType,
      dataConsumerId = null,
   }: DataConsumerInput) => {
      setDataConsumerContainers((oldContainers) =>
         oldContainers.filter(
            (c) =>
               c.dataConsumer.id !== dataConsumerId ||
               c.type !== dataConsumerType,
         ),
      )
   }

   return {
      dataConsumerContainers,
      initDataConsume,
      handleCloseDataConsumer,
   }
}

export default useDataConsumers
