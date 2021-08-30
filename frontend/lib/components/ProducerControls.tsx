import { useEffect, useRef, useState } from "react"
import { TransportDataType, TransportType } from "../types"
import Audio from "./Audio"
import Video from "./Video"
import MuteAudioButton from "../../assets/muteaudio.svg"
import ResumeAudioButton from "../../assets/resumeaudio.svg"
import MuteVideoButton from "../../assets/mutevideo.svg"
import ResumeVideoButton from "../../assets/resumevideo.svg"
import Button from "../components/Button"

const ProduceControlButton = ({
   children,
   onClick,
   selected,
}: {
   children
   onClick
   selected: boolean
}) => (
   <button
      onClick={onClick}
      type="button"
      className={`fill-current m-1 btn btn-xs md:btn-sm lg:btn-md  ${selected ? "btn-active" : ""
         }`}
   >
      {children}
   </button>
)

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
         <ProduceControlButton
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
         </ProduceControlButton>
         <ProduceControlButton
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
         </ProduceControlButton>
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
