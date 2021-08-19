import { useEffect, useState } from "react"

export const useUserMedia = (
   mediaConstraints: MediaStreamConstraints,
): MediaStream => {
   const [mediaStream, setMediaStream] = useState<MediaStream>()

   useEffect(() => {
      async function enableStream() {
         try {
            const stream = await navigator.mediaDevices.getUserMedia(
               mediaConstraints,
            )
            setMediaStream(stream)
         } catch (err) {
            // Removed for brevity
         }
      }

      if (!mediaStream) {
         enableStream()
      } else {
         return function cleanup() {
            mediaStream.getTracks().forEach((track) => {
               track.stop()
            })
         }
      }
   }, [mediaStream, mediaConstraints])

   return mediaStream!
}
