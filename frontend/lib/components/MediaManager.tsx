import { ConsumerContainer, ProducerContainer, TransportType } from "../types"
import AvatarComponent from "./AvatarComponent"
import MediaComponent from "./MediaComponent"
import ProducerControls from "./ProducerControls"

const MediaDistributor = ({
   transportType,
   container,
}: {
   transportType: TransportType
   container
}) => (
   <div>
      {container?.video ? (
         <MediaComponent
            name={container.peerName}
            transportType={transportType}
            mediaStream={container.video.mediaStream}
            mediaType="video"
         />
      ) : null}

      {container?.audio ? (
         <MediaComponent
            name={container.peerName}
            transportType={transportType}
            mediaStream={container.audio?.mediaStream}
            mediaType="audio"
         />
      ) : null}
   </div>
)

const MediaManager = ({
   transportType,
   containers,
   updateProducerOfType,
   createVideoProducer,
   createAudioProducer,
}: {
   transportType: TransportType
   containers: Array<ProducerContainer | ConsumerContainer>
   updateProducerOfType: any
   createVideoProducer: any
   createAudioProducer: any
}) => {
   if (transportType === "producer") {
      return (
         <>
            <MediaDistributor
               container={containers[0]}
               transportType={transportType}
            />
            <div className="flex items-center bg-gray-200">
               <AvatarComponent name={containers[0].name} />
               <ProducerControls
                  updateProducerOfType={updateProducerOfType}
                  createVideoProducer={createVideoProducer}
                  createAudioProducer={createAudioProducer}
                  audioProducerCreated={
                     containers[0].audio !== null &&
                     containers[0].audio !== undefined
                  }
                  videoProducerCreated={
                     containers[0].video !== null &&
                     containers[0].video !== undefined
                  }
               />
            </div>
         </>
      )
   } else {
      return (
         <>
            {containers.map((c) => (
               <div>
                  <MediaDistributor
                     key={c.id}
                     container={c}
                     transportType={transportType}
                  />
                  <AvatarComponent name={c.name} />
               </div>
            ))}
         </>
      )
   }
}

export default MediaManager
