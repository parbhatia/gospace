import { Consumer } from "mediasoup-client/lib/Consumer"
import { Producer } from "mediasoup-client/lib/Producer"
import { useEffect, useRef, useState } from "react"

const MediaComponent = ({
   peer,
   label,
   mediaStream,
}: {
   peer: Producer | Consumer
   label: string | null
   mediaStream: MediaStream
}) => {
   const videoRef: any = useRef()
   const [paused, setPaused] = useState(true)
   useEffect(() => {
      if (mediaStream && mediaStream.active) {
         setPaused(false)
      }
      if (videoRef.current) {
         videoRef.current.srcObject = mediaStream
         videoRef.current.muted = true
      }
   }, [mediaStream])
   useEffect(() => {
      return () => {
         console.log("Video Component is unmounting of peer", label)
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
         <video
            className="border-4 border-black shadow-lg"
            muted
            loop
            autoPlay
            //  controls
            playsInline
            ref={videoRef}
         ></video>
         <div className="w-full text-center">
            <h2 className="text-lg font-medium text-gray-900 title-font">
               {label}
            </h2>
            {/* <h3 className="mb-3 text-gray-500">UI Developer</h3> */}
         </div>
      </div>
   )
}

export default MediaComponent
