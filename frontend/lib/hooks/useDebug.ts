import { Transport } from "mediasoup-client/lib/Transport"
import { useEffect, useState } from "react"
import { Socket } from "socket.io-client"

const useDebug = ({
   socket,
   consumerTransport,
   producerTransport,
   producerContainers,
   consumerContainers,
   dataConsumerContainers,
   dataProducerContainers,
}: {
   socket: Socket
   consumerTransport: Transport | null
   producerTransport: Transport | null
   producerContainers
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
         },
         producerTransport: {
            id: consumerTransport?.id,
            closed: consumerTransport?.closed,
         },
         producerContainers: producerContainers.map((c) => ({
            id: c.producer.id,
            paused: c.producer.paused,
            mediaStream: {
               id: c.mediaStream.id,
               inactive: c.mediaStream.inactive,
               paused: c.mediaStream.paused,
            },
         })),
         consumerContainers: consumerContainers.map((c) => ({
            id: c.consumer.id,
            paused: c.consumer.paused,
            mediaStream: {
               id: c.mediaStream.id,
               inactive: c.mediaStream.inactive,
               paused: c.mediaStream.paused,
            },
         })),
         dataProducerContainers: dataProducerContainers.map((c) => ({
            id: c.dataProducer.id,
            type: c.type,
            paused: c.dataProducer.paused,
            closed: c.dataProducer.closed,
         })),
         dataConsumerContainers: dataConsumerContainers.map((c) => ({
            id: c.dataConsumer.id,
            type: c.type,
            paused: c.dataConsumer.paused,
            closed: c.dataConsumer.closed,
         })),
      },
      null,
      2,
   )
}

export default useDebug
