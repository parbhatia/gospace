import { useCallback, useEffect, useRef, useState } from 'react'
import tailwindConfig from "../../tailwind.config"
import MicrophoneLevel from "./MicrophoneLevel"
import VolumeControls from "./VolumeControls"

const volumeBarColor = tailwindConfig.theme.extend.colors['volume-meter']

// Note: The better way to control media stream audio would be to use gainnodes, and connect the gain node to our audio context. That way, we can also control stereo output!
// However, Chrome and Firefox dont allow this functinality right now

// Instead, we use audio context to monitor the audio level of a media stream, and normalize the results using the html audio element's volume level

const createAudioContext = (stream) => {
   const audioContext = new AudioContext()
   const audioSource = audioContext.createMediaStreamSource(stream)
   const analyser = audioContext.createAnalyser()
   analyser.fftSize = 512
   analyser.minDecibels = -90
   analyser.maxDecibels = -45
   analyser.smoothingTimeConstant = 0.4
   audioSource.connect(analyser)
   return analyser
}

const createVolumes = (analyser) => new Uint8Array(analyser.frequencyBinCount)

//time in ms we wait to update audio levels
const AUDIO_MONITOR_FREQUENCY_MS = 150

const Audio = ({
   mediaRef,
}: {
   mediaRef: React.MutableRefObject<HTMLAudioElement>
}) => {
   const volumeBarContextRef = useRef<any>()
   const [volume, setVolume] = useState(100)
   const [audioContext, setAudioContext] = useState<{
      analyser: AnalyserNode | null, volumes: Uint8Array | null
   }>({ analyser: null, volumes: null })

   const handleChangeVolume = (e) => {
      const newVolume = e.target.value / 100
      mediaRef.current.volume = newVolume
      setVolume(e.target.value)
   }

   const volumeCallBack = () => {
      if (audioContext.analyser && audioContext.volumes) {
         const analyser = audioContext.analyser
         const volumes = audioContext.volumes
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

         //Normalize audio level's using the audio specific on the html audio element
         //This works reasonably well for now!
         const audioElementVolume = volume / 100
         const normalizedVolumePercentage = volumeLevelPercentage * audioElementVolume

         canvasMeter.fillRect(
            0,
            10,
            (normalizedVolumePercentage * canvasMeterWidth) / 100,
            canvasMeterHeight - 10,
         )
      }
   }


   useEffect(() => {
      const volumeCheckInterval = setInterval(
         volumeCallBack
         , AUDIO_MONITOR_FREQUENCY_MS)
      return () => {
         clearInterval(volumeCheckInterval)
      }

   }, [audioContext, volume])


   useEffect(() => {
      if (volumeBarContextRef.current && mediaRef.current.srcObject) {
         console.log("monitoring audio")
         const analyser = createAudioContext(mediaRef.current.srcObject)
         const volumes = createVolumes(analyser)
         setAudioContext({ volumes, analyser })
         //Storing the audio context in state was the cleanest way to use setInterval!
      }
      return () => {
         setAudioContext({ volumes: null, analyser: null })
      }

   }, [volumeBarContextRef.current, mediaRef.current])

   return (
      <>
         <audio
            className="hidden "
            autoPlay
            controls
            playsInline
            ref={mediaRef}
         ></audio>
         <MicrophoneLevel audioRef={volumeBarContextRef} />
         <VolumeControls volume={volume} handleChangeVolume={handleChangeVolume} />
      </>
   )
}

export default Audio
