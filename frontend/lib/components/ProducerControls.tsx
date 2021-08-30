import { useEffect, useRef, useState } from "react"
import { TransportDataType, TransportType } from "../types"
import Audio from "./Audio"
import Video from "./Video"
import MuteAudioButton from "../../assets/muteaudio.svg"
import ResumeAudioButton from "../../assets/resumeaudio.svg"
import MuteVideoButton from "../../assets/mutevideo.svg"
import ResumeVideoButton from "../../assets/resumevideo.svg"
import Button from "../components/Button"

const ProducerControls = ({
   updateProducerOfType,
   createVideoProducer,
   createAudioProducer,
   audioProducerCreated,
   videoProducerCreated,
}: {
   updateProducerOfType: any
   createVideoProducer: any
   createAudioProducer: any
   audioProducerCreated: boolean
   videoProducerCreated: boolean
}) => {
   const [muteAudio, setMuteAudio] = useState(false)
   const [muteVideo, setVideoAudio] = useState(false)
   return (
      <div className="flex">
         <Button
            selected={muteAudio}
            onClick={async () => {
               if (!muteAudio) {
                  const status = await updateProducerOfType("audio", "pause")
                  if (status) {
                     setMuteAudio(true)
                  }
               } else {
                  const status = await updateProducerOfType("audio", "resume")
                  if (status) {
                     setMuteAudio(false)
                  }
               }
            }}
         >
            {muteAudio ? <MuteAudioButton /> : <ResumeAudioButton />}
         </Button>
         <Button
            selected={muteVideo}
            onClick={async () => {
               if (!muteVideo) {
                  const status = await updateProducerOfType("video", "pause")
                  if (status) {
                     setVideoAudio(true)
                  }
               } else {
                  const status = await updateProducerOfType("video", "resume")
                  if (status) {
                     setVideoAudio(false)
                  }
               }
            }}
         >
            {muteVideo ? <MuteVideoButton /> : <ResumeVideoButton />}
         </Button>
         {/* {!audioProducerCreated && (
            <ProduceControlButton
               selected={muteVideo}
               onClick={createAudioProducer}
            >
               <span className="text-xs">Audio On</span>
            </ProduceControlButton>
         )} */}
      </div>
   )
}

export default ProducerControls
