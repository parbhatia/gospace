import { useEffect, useRef, useState } from "react"
import { TransportDataType, TransportType } from "../types"
import Audio from "./Audio"
import Video from "./Video"
import tailwindConfig from "../../tailwind.config"
import MicrophoneLevel from "./MicrophoneLevel"
import VolumeMuteButton from "./VolumeMuteButton"

const volumeBarColor = tailwindConfig.theme.extend.colors['volume-meter']

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
         analyser.minDecibels = -90
         analyser.maxDecibels = -45
         analyser.smoothingTimeConstant = 0.4
         audioSource.connect(analyser)
         const volumes = new Uint8Array(analyser.frequencyBinCount)

         const gainNode = audioContext.createGain()
         console.log(gainNode.gain.value)

         // pass audio element, which is our stream, into the audio context
         const track = audioContext.createMediaElementSource(stream)
         track.connect(gainNode).connect(audioContext.destination)

         //based off https://stackoverflow.com/a/64650826/13886575
         const volumeCallback = () => {
            analyser.getByteFrequencyData(volumes)
            let volumeSum = 0
            // we are getting the frequency amplitudes, then taking a reasonable average
            for (const volume of volumes) volumeSum += volume
            const averageVolume = volumeSum / volumes.length
            const maxVolumeVal = analyser.maxDecibels - analyser.minDecibels
            // Value range: 127 = analyser.maxDecibels - analyser.minDecibels;
            if (!volumeBarContextRef?.current) return
            const canvasMeter = volumeBarContextRef.current.getContext("2d")
            const canvasMeterWidth = volumeBarContextRef.current.width
            const canvasMeterHeight = volumeBarContextRef.current.height
            canvasMeter.clearRect(0, 0, canvasMeterWidth, canvasMeterHeight)
            canvasMeter.fillStyle = volumeBarColor

            const volumeLevelPercentage = (averageVolume * 100) / maxVolumeVal

            canvasMeter.fillRect(
               0,
               10,
               (volumeLevelPercentage * canvasMeterWidth) / 100,
               canvasMeterHeight - 10,
            )
         }
         setInterval(volumeCallback, 100)
      } catch (e) {
         console.error(
            "Failed to initialize volume visualizer, simulating instead...",
            e,
         )
      }
   }

   useEffect(() => {
      if (volumeBarContextRef.current) {
         //volumeBarContextRef will only be rendered for mediaType audio, so no need to check mediaType before monitoring audio
         monitorAudio(mediaStream)
      }
   }, [volumeBarContextRef])

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
            // monitorAudio(mediaStream)
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
      <>
         {mediaType === "video" ? (
            <Video mediaRef={mediaRef} paused={paused} />
         ) : (
            <div className="w-full">
               <Audio mediaRef={mediaRef} />
               <MicrophoneLevel audioRef={volumeBarContextRef} />
               <VolumeMuteButton audioRef={mediaRef} />
            </div>
         )}
      </>
   )
}

export default MediaComponent