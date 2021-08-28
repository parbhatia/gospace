import { compress, decompress } from "lz-string"
import { DataProducer } from "mediasoup-client/lib/DataProducer"
import { useEffect, useRef, useState } from "react"
import CanvasDraw from "../components/CanvasDraw"

const useRoomCanvas = ({ createDataProducer }: { createDataProducer: any }) => {
   const canvasRef = useRef<CanvasDraw>(null)
   const [canvasProducer, setCanvasProducer] = useState<DataProducer | null>()
   const openRoomCanvas = async () => {
      try {
         const producer = await createDataProducer({ type: "canvas" })
         setCanvasProducer(producer)
      } catch (e) {
         console.error("Failed to connect to rooom canvas")
      }
   }
   const closeRoomCanvas = async () => {
      try {
         if (canvasProducer && !canvasProducer.closed) {
            await canvasProducer.close()
            // canvas consumers will close automatically because of how we listen to close events on data producers and consumers
         }
         setCanvasProducer(null)
      } catch (e) {
         console.error("Failed to close rooom canvas")
      }
   }
   useEffect(() => {
      if (canvasProducer && canvasProducer.closed) {
         setCanvasProducer(null)
      }
      return () => {
         setCanvasProducer(null)
      }
   }, [setCanvasProducer])

   const sendCanvasData = async () => {
      if (
         !canvasProducer ||
         canvasProducer.closed ||
         !canvasRef ||
         !canvasRef.current
      ) {
         console.error("Error sending canvas data")
         return null
      }
      const savedData = await canvasRef.current.getSaveData()
      const compressedStringData = compress(savedData)
      if (canvasProducer.readyState === "open") {
         await canvasProducer.send(JSON.stringify(compressedStringData))
      } else {
         console.error(
            "Error sending canvas data, data producer not in ready state",
         )
      }
   }

   const loadToCanvas = async (rawData) => {
      if (!canvasRef || !canvasRef.current) return null
      const decompressedParsedCanvasData = decompress(JSON.parse(rawData))
      await canvasRef.current!.loadSaveData(
         decompressedParsedCanvasData,
         true,
         false,
      ) //2nd param is immediate loading, 3rd param is whether we want the onChange function to be triggered
   }

   return {
      sendCanvasData,
      openRoomCanvas,
      canvasRef,
      loadToCanvas,
      closeRoomCanvas,
   }
}

export default useRoomCanvas
