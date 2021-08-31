import { ConsumerContainer, ProducerContainer, TransportType } from "../types"
import AvatarComponent from "./AvatarComponent"
import MediaDistributor from "./MediaDistributor"
import ReactScaler from 'rect-scaler'
import { useCallback, useEffect, useState } from "react"


const debounce = (func, delay) => {
   let timer
   return () => {
      clearTimeout(timer)
      timer = setTimeout(_ => {
         timer = null
         // func.apply(this, arguments)
         func()
      }, delay)
   }
}

interface ConsumerDisplayAreaDimensions {
   possibleRowCount: number
   possibleColCount: number
   possibleWidth: number
   possibleHeight: number
}

const ConsumerDistributor = ({
   transportType,
   containers,

}: {
   transportType: TransportType
   containers: Array<ProducerContainer | ConsumerContainer>

}) => {
   const [dimensions, setDimensions] = useState({
      height: 0,
      width: 0

   })
   useEffect(() => {
      const DEBOUNCED_TIME_MS = 200
      const handleResize = () => {
         setDimensions({
            height: window.innerHeight,
            width: window.innerWidth
         })
      }
      const debouncedHandleResize = debounce(handleResize, DEBOUNCED_TIME_MS)
      window.addEventListener('resize', debouncedHandleResize)
      return () => {
         window.removeEventListener('resize', debouncedHandleResize)
      }
   }, [])

   const [displayRenderInfo, setDisplayRenderInfo] = useState<ConsumerDisplayAreaDimensions | null>(null)

   const consumerMediaRef = useCallback(node => {
      if (node !== null) {
         //get the dimensions of the section we want to display consumer media (audio/video)
         const targetWidth = node.getBoundingClientRect().width
         const targetHeight = node.getBoundingClientRect().height
         // console.log({ targetHeight, targetWidth, })
         const numSquares = containers.length
         if (numSquares !== 0) {

            const { rows, cols, width, height, area } = ReactScaler.largestSquare(targetWidth, targetHeight, numSquares)
            // console.log({ rows, cols, width, height, })
            // console.log({ rows, cols, width, height, area })
            setDisplayRenderInfo({ possibleRowCount: rows, possibleColCount: cols, possibleWidth: width, possibleHeight: height })
         }
      }
   }, [dimensions, containers])

   // //assuming we're using m-2 in tailwind = 8px
   // const ITEM_MARGIN_PER_SIZE = 4
   // // since we're using flex-row, we need to account for one side of margin for each item
   // const ACCUMULATED_MARGIN_WIDTHS = (ITEM_MARGIN_PER_SIZE * containers.length) + ITEM_MARGIN_PER_SIZE

   return (
      <div ref={consumerMediaRef} className="flex flex-wrap content-center justify-center w-full h-full ">
         {
            containers.map((c, i) => (
               <div key={`${c.id}${i}`}
                  // style={{ flexBasis: '400px' }}
                  style={{ width: displayRenderInfo ? displayRenderInfo.possibleWidth : 0 }}
                  className="flex flex-col items-center justify-center w-full p-4">
                  <MediaDistributor
                     container={c}
                     transportType={transportType}
                  />
                  <div className="p-1">
                     <AvatarComponent name={c.name} />
                  </div>
               </div>))
         }
      </div >)
}

export default ConsumerDistributor
