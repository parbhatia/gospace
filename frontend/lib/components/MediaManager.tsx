import { Consumer } from "mediasoup-client/lib/Consumer"
import { Producer } from "mediasoup-client/lib/Producer"
import { useEffect, useRef, useState } from "react"
import AvatarComponent from "./AvatarComponent"
import AudioIcon from "../../assets/audioIcon.svg"
import { TransportDataType } from "../types"
import Video from "./Video"
import Audio from "./Audio"

// const MediaDelegator = ({ label, container }) => {
//    return container.videoPackage ? (
//       <MediaManager
//          label={label}
//          mediaStream={container.videoPackage.mediaStream}
//          peer={container.videoPackage.consumer}
//          mediaType={container.videoPackage.consumer.appData.dataType}
//       />
//    ) : null
// }

const MediaManager = ({
   id,
   peer,
   label,
   mediaStream,
   mediaType,
}: {
   id: string
   peer: Producer | Consumer
   label: string | null
   mediaStream: MediaStream
   mediaType: TransportDataType
}) => {
   const isProducer = peer instanceof Producer
   const isConsumer = peer instanceof Producer
   const mediaRef = useRef<any>()
   const [paused, setPaused] = useState(true)
   useEffect(() => {
      // console.log(mediaStream)
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
         // console.log("Video Component is unmounting of peer", label)
         mediaStream.getTracks().forEach((track) => {
            track.stop()
         })
      }
   }, [])
   return (
      <div className={`w-full ${paused ? " animate-pulse" : ""} `}>
         {/* <img
            alt="team"
            className="flex-shrink-0 object-cover object-center w-full h-56 mb-4 rounded-lg"
            src="https://dummyimage.com/202x202"
         /> */}
         {mediaType === "video" ? (
            <Video mediaRef={mediaRef} />
         ) : (
            <Audio mediaRef={mediaRef} />
         )}
         <AvatarComponent name={label} />
      </div>
   )
}

// export default MediaDelegator
export default MediaManager
