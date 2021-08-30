import { Transport } from "mediasoup-client/lib/Transport"
import { useEffect, useState } from "react"
import { Socket } from "socket.io-client"
import { DataProducer } from "mediasoup-client/lib/DataProducer"

const containerMapper = (
   container,
   containerType: "producer" | "consumer",
) => ({
   id: container?.id,
   name: container?.name,
   audio: {
      mediaStream: {
         id: container?.audio?.mediaStream.id,
         inactive: container?.audio?.mediaStream.inactive,
         paused: container?.audio?.mediaStream.paused,
      },
      [containerType]: {
         id: container?.audio?.[containerType].id,
         paused: container?.audio?.[containerType].paused,
         appData: container?.audio?.[containerType].appData,
      },
   },
   video: {
      mediaStream: {
         id: container?.video?.mediaStream.id,
         inactive: container?.video?.mediaStream.inactive,
         paused: container?.video?.mediaStream.paused,
      },
      [containerType]: {
         id: container?.video?.[containerType].id,
         paused: container?.video?.[containerType].paused,
         appData: container?.video?.[containerType].appData,
      },
   },
})

const useDebug = ({
   socket,
   consumerTransport,
   producerTransport,
   producerContainer,
   consumerContainers,
   dataConsumerContainers,
   dataProducerContainers,
}: {
   socket: Socket
   consumerTransport: Transport | null
   producerTransport: Transport | null
   producerContainer
   consumerContainers
   dataConsumerContainers
   dataProducerContainers
}) => {
   return JSON.stringify(
      {
         socket: {
            id: socket.id,
            connected: socket.connected,
         },
         consumerTransport: {
            id: consumerTransport?.id,
            closed: consumerTransport?.closed,
            appData: consumerTransport?.appData,
         },
         producerTransport: {
            id: producerTransport?.id,
            closed: producerTransport?.closed,
            appData: producerTransport?.appData,
         },
         producerContainer: containerMapper(producerContainer, "producer"),
         consumerContainers: consumerContainers.map((c) =>
            containerMapper(c, "consumer"),
         ),
         dataProducerContainers: dataProducerContainers.map((c) => ({
            id: c.dataProducer.id,
            type: c.type,
            paused: c.dataProducer.paused,
            closed: c.dataProducer.closed,
            appData: c.dataProducer.appData,
            bufferedAmount: c.dataProducer.bufferedAmount,
            readyState: c.dataProducer.readyState,
            bufferedAmountLowThreshold:
               c.dataProducer.bufferedAmountLowThreshold,
         })),
         dataConsumerContainers: dataConsumerContainers.map((c) => ({
            id: c.dataConsumer.id,
            type: c.type,
            paused: c.dataConsumer.paused,
            closed: c.dataConsumer.closed,
            readyState: c.dataConsumer.readyState,
            appData: c.dataConsumer.appData,
            binaryType: c.dataConsumer.binaryType,
         })),
      },
      null,
      2,
   )
}

export default useDebug
