import { Consumer } from "mediasoup-client/lib/Consumer"
import { Producer } from "mediasoup-client/lib/Producer"
import { useEffect, useRef } from "react"

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
   useEffect(() => {
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
      <div className="border-2">
         <video
            muted
            loop
            autoPlay
            //  controls
            playsInline
            ref={videoRef}
            style={{
               width: "100px",
               height: "100px",
            }}
         ></video>
         {label ? <p>{label}</p> : null}
      </div>
   )
}

export default MediaComponent
