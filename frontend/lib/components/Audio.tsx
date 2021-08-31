import { useEffect, useRef, useState } from 'react'
import MicrophoneLevel from "./MicrophoneLevel"
import VolumeControls from "./VolumeControls"

// Note: The better way to control media stream audio would be to use gainnodes, and connect the gain node to our audio context. That way, we can also control stereo output!
// However, Chrome and Firefox dont allow this functinality right now

// Instead, we use audio context to monitor the audio level of a media stream, and normalize the results using the html audio element's volume level

//time in ms we wait to update audio levels
const AUDIO_MONITOR_FREQUENCY_MS = 500

//sample size of visual data. this will be used by FFT. Increase this value for more accuracy at the cost of more computations
const NUM_OF_SAMPLES = 64

const createAudioAnalyser = (stream) => {
   const audioContext = new AudioContext()
   const audioSource = audioContext.createMediaStreamSource(stream)
   const analyser = audioContext.createAnalyser()
   analyser.minDecibels = -90
   analyser.maxDecibels = 10
   analyser.smoothingTimeConstant = 0.5
   analyser.fftSize = NUM_OF_SAMPLES
   audioSource.connect(analyser)
   return analyser
}

//Returns an array of frequency data, frequency bin count is half of fft size
const createVolumes = (analyser) => new Uint8Array(analyser.frequencyBinCount)



const Audio = ({
   mediaRef,
}: {
   mediaRef: React.MutableRefObject<HTMLAudioElement>
}) => {
   const volumeBarContextRef = useRef<any>()
   const [volume, setVolume] = useState<number>(100)
   const [audioContext, setAudioContext] = useState<{
      analyser: AnalyserNode | null, volumes: Uint8Array | null
   }>({ analyser: null, volumes: null })

   const handleChangeVolume = (e) => {
      const intVolume = parseInt(e.target.value)
      const newVolume = intVolume / 100
      mediaRef.current.volume = newVolume
      setVolume(intVolume)
   }

   const monitorVolumeCallBack = () => {
      // console.log("callback")
      if (audioContext.analyser && audioContext.volumes) {
         const analyser = audioContext.analyser
         const volumes = audioContext.volumes

         if (!volumeBarContextRef?.current) return
         const canvasMeter = volumeBarContextRef.current.getContext("2d")
         const canvasMeterWidth = volumeBarContextRef.current.width
         const canvasMeterHeight = volumeBarContextRef.current.height

         function renderAudioSpectrum() {
            //Instead of computing byteFrequencyData every render cycle, we can actually just compute it once, store the results, and just base our paint off stale data. I doubt users would even know. Volume scaling will still scale the graph values down. Revert to doing this, if this causes too much browser stress
            analyser.getByteFrequencyData(volumes)

            const newVolumes = volumes.filter(data => {
               return data !== 0
            })

            canvasMeter.clearRect(0, 0, canvasMeterWidth, canvasMeterHeight)
            canvasMeter.fillStyle = "transparent"
            canvasMeter.fillRect(0, 0, canvasMeterWidth, canvasMeterHeight)

            const bufferLength = newVolumes.length
            const barWidth = (canvasMeterWidth / bufferLength / 2) //divide by 2, since we're reflecting bars across vertical axis

            //We are going to normalize all the data frequency values as percentages
            //Get the max frequency data, we will divide all the rest of the data points by this values
            //This way, each bar in our graph will have a percetage value
            //This way, we're not dependent on sampling less data points using FFT, in order to increase absolute heights of the bars

            let maxData = -Infinity
            for (let i = 0; i < newVolumes.length; i++)
               if (newVolumes[i] > maxData) maxData = newVolumes[i]

            let xPos = 0 //x pos of the start of next bar
            for (let i = 0; i < bufferLength; i++) {
               // Each frequencyDataByte gets converted to a percentage of height for a single bar with respect to the canvas height
               // We still need to normalize audio level's using the audio specific on the html audio element
               const audioElementVolumePercentage = volume / 100

               const barHeight = newVolumes[i] / maxData * audioElementVolumePercentage

               const r = barHeight + (25 * (i / bufferLength))
               const g = 250 * (i / bufferLength)
               const b = 50
               canvasMeter.fillStyle = `rgb(${r},${g},${b})`

               //start from middle, go to end
               canvasMeter.fillRect(xPos + canvasMeterWidth / 2, 0, barWidth, canvasMeterHeight * barHeight)
               //start from middle, go to start
               canvasMeter.fillRect(canvasMeterWidth - (barWidth + 1) - (xPos + canvasMeterWidth / 2), 0, barWidth, canvasMeterHeight * barHeight)

               xPos += barWidth + 1
            }
         }
         renderAudioSpectrum()
      }
   }

   useEffect(() => {
      //Skip using requestAnimationFrame, since these are still expensive computations,
      const volumeCheckInterval = setInterval(
         monitorVolumeCallBack
         , AUDIO_MONITOR_FREQUENCY_MS)
      return () => {
         clearInterval(volumeCheckInterval)
      }

   }, [audioContext, volume])


   useEffect(() => {
      if (volumeBarContextRef.current && mediaRef.current.srcObject) {
         // console.log("monitoring audio")
         const analyser = createAudioAnalyser(mediaRef.current.srcObject)
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
         <VolumeControls volume={volume} handleChangeVolume={handleChangeVolume} />
         <MicrophoneLevel audioRef={volumeBarContextRef} />
      </>
   )
}

export default Audio
