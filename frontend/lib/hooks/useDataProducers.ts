import { DataProducer } from "mediasoup-client/lib/DataProducer"
import { Transport } from "mediasoup-client/lib/Transport"
import { useState } from "react"
import { Socket } from "socket.io-client"
import {
   DataProducerInput,
   DataProducerOrConsumerType,
   UserMeta,
} from "../types"

const useDataProducers = ({
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
   const [dataProducerContainers, setDataProducerContainers] = useState<
      Array<{
         dataProducer: DataProducer
         type: DataProducerOrConsumerType
      }>
   >([])

   // by specifying data producer types, we can target canvas data, or text data
   const createDataProducer = async ({
      type,
   }: {
      type: DataProducerOrConsumerType
   }) =>
      new Promise(async (resolve, reject) => {
         console.log("createDataProducer")
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
            const dataProducer = await transport!.produceData({
               appData: {
                  dataType: type,
               },
            })

            //data producer will close automatically since transport closed
            dataProducer.on("transportclose", () => {
               console.log("Data Producer transport closed in data producer")
               removeDataProducer({
                  dataProducerId: dataProducer.id,
                  dataProducerType: type,
               })
            })

            dataProducer.on("error", (err) => {
               console.log("Data Producer has error", err)
               // removeDataProducer({
               //    dataProducerId: dataProducer.id,
               //    dataProducerType: type,
               // })
            })
            dataProducer.on("bufferedamountlow", () => {
               console.log("Data Producer has buffered amount low")
               // removeDataProducer({
               //    dataProducerId: dataProducer.id,
               //    dataProducerType: type,
               // })
            })

            dataProducer.on("close", () => {
               signalDataProducerClosed(dataProducer.id)
               console.log("Data Producer has closed in data producer")
               removeDataProducer({
                  dataProducerId: dataProducer.id,
                  dataProducerType: type,
               })
            })
            dataProducer.observer.on("close", () => {
               console.log(
                  "Data Producer has been observed closed in data producer",
               )
               signalDataProducerClosed(dataProducer.id)
               removeDataProducer({
                  dataProducerId: dataProducer.id,
                  dataProducerType: type,
               })
            })

            const newDataProducerContainer = {
               dataProducer: dataProducer,
               type,
            }
            setDataProducerContainers((oldContainers) => [
               ...oldContainers,
               newDataProducerContainer,
            ])
            resolve(dataProducer)
         } catch (e) {
            reject(e)
         }
      })

   const removeDataProducer = ({
      dataProducerType,
      dataProducerId = null,
   }: DataProducerInput) => {
      setDataProducerContainers((oldContainers) =>
         oldContainers.filter(
            (c) =>
               c.dataProducer.id !== dataProducerId ||
               c.type !== dataProducerType,
         ),
      )
   }

   //If data producer closes without producer transport closing
   const signalDataProducerClosed = (dataProducerId: string) => {
      socket.emit("dataProducerClosed", {
         userMeta,
         roomId,
         dataProducerId,
      })
   }
   return { dataProducerContainers, createDataProducer }
}

export default useDataProducers
