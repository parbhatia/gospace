import { Transport } from "mediasoup-client/lib/Transport"
import { useEffect, useState } from "react"
import { Socket } from "socket.io-client"

const useDebug = ({
   socket,
   consumerTransport,
   producerTransport,
   producerContainers,
   consumerContainers,
   dataProducers,
   dataConsumers,
}: {
   socket: Socket
   consumerTransport: Transport | null
   producerTransport: Transport | null
   producerContainers
   consumerContainers
   dataProducers
   dataConsumers
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
         dataProducers,
         dataConsumers,
      },
      null,
      2,
   )
}

export default useDebug
