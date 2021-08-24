import { compress, decompress } from "lz-string"
import { DataProducer } from "mediasoup-client/lib/DataProducer"
import { useEffect, useRef, useState } from "react"
import CanvasDraw from "react-canvas-draw"

const useRoomCanvas = ({ createDataProducer }: { createDataProducer: any }) => {
   const canvasRef = useRef<CanvasDraw>(null)
   const [canvasProducer, setCanvasProducer] = useState<DataProducer | null>()
   const [loadingCanvasData, setLoadingCanvasData] = useState(false)
   const [displayCanvas, setDisplayCanvas] = useState(false)
   const toggleDisplayCanvas = async () => {
      if (displayCanvas) {
         // canvasProducer!.pause()
      }
      setDisplayCanvas((oldVal) => !oldVal)
   }
   const openRoomCanvas = async () => {
      try {
         const producer = await createDataProducer({ type: "canvas" })
         setCanvasProducer(producer)
      } catch (e) {
         console.error("Failed to connect to rooom canvas")
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
      if (loadingCanvasData) return null
      else if (
         !canvasProducer ||
         canvasProducer.closed ||
         !canvasRef ||
         !canvasRef.current
      ) {
         // console.log(
         //    !canvasProducer,
         //    canvasProducer.closed,
         //    !canvasRef,
         //    !canvasRef.current,
         // )
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
      setLoadingCanvasData(true)
      canvasRef.current!.loadSaveData(decompressedParsedCanvasData, true) //2nd param is immediate loading
      setLoadingCanvasData(false)
   }

   return {
      sendCanvasData,
      openRoomCanvas,
      canvasRef,
      loadToCanvas,
      toggleDisplayCanvas,
   }
}

export default useRoomCanvas

//    //Sends raw data, or JSON stringified data via data producer
//    const sendDataData = async ({
//       data,
//       sendRaw = false,
//    }: {
//       data: any
//       sendRaw: boolean
//    }) => {
//       if (canvasProducer && !canvasProducer.closed) {
//          if (sendRaw) {
//             await canvasProducer.send(data)
//          } else {
//             await canvasProducer.send(JSON.stringify(data))
//          }
//       }
//    }
