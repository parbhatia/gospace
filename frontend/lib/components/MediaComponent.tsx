import { useEffect, useRef, useState } from "react"
import { TransportDataType, TransportType } from "../types"
import Audio from "./Audio"
import Video from "./Video"

const MediaComponent = ({
   name,
   transportType,
   mediaStream,
   mediaType,
}: {
   name: string
   transportType: TransportType
   mediaStream: MediaStream
   mediaType: TransportDataType
}) => {
   const isProducer = transportType === "producer"
   const mediaRef = useRef<any>()
   const [paused, setPaused] = useState(true)
   useEffect(() => {
      if (mediaStream && mediaStream.active) {
         setPaused(false)
      }
      if (mediaRef.current) {
         mediaRef.current.srcObject = mediaStream
         if (mediaType === "video") {
            //mute videos initially, since chrome and probably other browsers don't allow autoplay if this is not done
            mediaRef.current.muted = true
         } else if (mediaType === "audio") {
            if (isProducer) {
               //mute audio of my microphone
               mediaRef.current.muted = true
            }
         }
      }
   }, [mediaStream])
   useEffect(() => {
      return () => {
         //  console.log("Video Component is unmounting of peer ", name)
         mediaStream.getTracks().forEach((track) => {
            track.stop()
         })
      }
   }, [])
   return (
      <div className={`w-full ${paused ? " animate-pulse" : ""} `}>
         {mediaType === "video" ? (
            <Video mediaRef={mediaRef} />
         ) : (
            <Audio mediaRef={mediaRef} />
         )}
      </div>
   )
}

export default MediaComponent

//  <img
//    alt="team"
//    className="flex-shrink-0 object-cover object-center w-full h-56 mb-4 rounded-lg"
//    src="https://dummyimage.com/202x202"
// />
