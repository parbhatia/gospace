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
   <>
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
   </>
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
         <div
            className="self-stretch flex-auto w-full bg-red-400 border-2 md:w-1/2 lg:w-1/4 "
         ></div>
      )
      // return (
      //    <div className="bg-red-400 border-2">
      //       <MediaDistributor
      //          container={containers[0]}
      //          transportType={transportType}
      //       />
      //       <div className="flex items-center p-1 bg-gray-200">
      //          <AvatarComponent name={containers[0].name} />
      //          {/* <ProducerControls
      //             updateProducerOfType={updateProducerOfType}
      //             createVideoProducer={createVideoProducer}
      //             createAudioProducer={createAudioProducer}
      //             audioProducerCreated={
      //                containers[0].audio !== null &&
      //                containers[0].audio !== undefined
      //             }
      //             videoProducerCreated={
      //                containers[0].video !== null &&
      //                containers[0].video !== undefined
      //             }
      //          /> */}
      //       </div>
      //    </div>
      // )
   } else {
      return (
         <>
            {containers.map((c) => (
               <div key={c.id} className="">
                  <MediaDistributor
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
