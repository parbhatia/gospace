import { Transport } from "mediasoup-client/lib/Transport"
import { useCallback } from "react"

const useHandleNewPeers = ({
   initConsumeMedia,
   initDataConsume,
   producerTransport,
   consumerTransport,
}: {
   initConsumeMedia: any
   initDataConsume: any
   producerTransport: Transport | null
   consumerTransport: Transport | null
}) => {
   const cannotHandleNewPeers =
      !producerTransport ||
      producerTransport.closed ||
      !consumerTransport ||
      consumerTransport.closed

   //We handle not consuming our own producer in backend
   const handleNewProducer = useCallback(
      async (msg) => {
         if (cannotHandleNewPeers) {
            return
         }
         const {
            peerId,
            peerName,
            producerId,
            appData,
         }: {
            peerId: string
            peerName: string
            producerId: string
            appData: any
         } = msg
         // console.log(
         //    `Client received broadcast message for new producer ${peerName}`,
         // )
         await initConsumeMedia({ peerId, peerName, producerId, appData })
      },
      [initConsumeMedia, cannotHandleNewPeers],
   )

   //We handle not consuming our own producer in backend
   const handleNewDataProducer = useCallback(
      async (msg: any) => {
         console.log("handleNewDataProducer")
         if (cannotHandleNewPeers) {
            return
         }
         const {
            peerId,
            dataProducerId,
            appData,
         }: { peerId: string; dataProducerId: string; appData: any } = msg
         console.log("Client received broadcast message for new data producer")
         await initDataConsume({ peerId, dataProducerId, appData })
      },
      [initDataConsume, cannotHandleNewPeers],
   )

   return { handleNewProducer, handleNewDataProducer }
}

export default useHandleNewPeers
