import { useCallback } from "react"

const useHandleNewPeers = ({
   initConsumeMedia,
   initDataConsume,
}: {
   initConsumeMedia: any
   initDataConsume: any
}) => {
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

   //We handle not consuming our own producer in backend
   const handleNewDataProducer = useCallback(
      async (msg: any) => {
         const {
            peerId,
            dataProducerId,
         }: { peerId: string; dataProducerId: string } = msg
         console.log("Client received broadcast message for new data producer")
         await initDataConsume({ peerId, dataProducerId })
      },
      [initDataConsume],
   )

   return { handleNewProducer, handleNewDataProducer }
}

export default useHandleNewPeers
