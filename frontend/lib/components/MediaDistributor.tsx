import { TransportType } from "../types"
import MediaComponent from "./MediaComponent"

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
export default MediaDistributor