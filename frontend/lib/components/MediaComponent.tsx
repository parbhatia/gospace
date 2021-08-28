import { useEffect, useRef, useState } from "react"
import { TransportDataType, TransportType } from "../types"
import Audio from "./Audio"
import Video from "./Video"

const MicrophoneLevel = ({ audioRef }) => (
   <canvas
      className="border-2"
      ref={audioRef}
      width="300px"
      height="25px"
      id="microphoneLevel"
      // style="background-color: black;"
   ></canvas>
)

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
   const volumeBarContextRef = useRef<any>()

   const [paused, setPaused] = useState(true)

   const monitorAudio = async (stream) => {
      try {
         const audioContext = new AudioContext()
         const audioSource = audioContext.createMediaStreamSource(stream)
         const analyser = audioContext.createAnalyser()
         analyser.fftSize = 512
         analyser.minDecibels = -127
         analyser.maxDecibels = 0
         analyser.smoothingTimeConstant = 0.4
         audioSource.connect(analyser)
         const volumes = new Uint8Array(analyser.frequencyBinCount)

         //based off https://stackoverflow.com/a/64650826/13886575
         const volumeCallback = () => {
            analyser.getByteFrequencyData(volumes)
            let volumeSum = 0
            for (const volume of volumes) volumeSum += volume
            const averageVolume = volumeSum / volumes.length
            const maxVolumeVal = 127
            // Value range: 127 = analyser.maxDecibels - analyser.minDecibels;

            const canvasMeter = volumeBarContextRef.current.getContext("2d")
            const canvasMeterWidth = volumeBarContextRef.current.width
            const canvasMeterHeight = volumeBarContextRef.current.height
            canvasMeter.clearRect(0, 0, canvasMeterWidth, canvasMeterHeight)
            canvasMeter.fillStyle = "#00ff00"

            const volumeLevelPercentage = (averageVolume * 100) / maxVolumeVal

            console.log({
               volumeLevelPercentage,
            })

            canvasMeter.fillRect(
               0,
               0,
               (volumeLevelPercentage * canvasMeterWidth) / 100,
               canvasMeterHeight,
            )
         }
         setInterval(volumeCallback, 100)
      } catch (e) {
         console.error(
            "Failed to initialize volume visualizer, simulating instead...",
            e,
         )
      }
      // Use
      // startButton.addEventListener("click", () => {
      // Updating every 100ms (should be same as CSS transition speed)
      // if (volumeCallback !== null && volumeInterval === null)
      //    volumeInterval = setInterval(volumeCallback, 100)
      // setInterval(volumeCallback, 100)
      // })
      // stopButton.addEventListener("click", () => {
      //    if (volumeInterval !== null) {
      //       clearInterval(volumeInterval)
      //       volumeInterval = null
      //    }
      // })
   }
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
            monitorAudio(mediaStream)
            // console.log(volumeBarContextRef)
            // console.log(volumeBarContextRef.current.getContext("2d"))
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
            <>
               <Audio mediaRef={mediaRef} />
               <MicrophoneLevel audioRef={volumeBarContextRef} />
            </>
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
