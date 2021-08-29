import { ProducerContainer } from "../types"
import MediaDistributor from "./MediaDistributor"




const ProducerDistributor = ({
    producerContainer

}: {
    producerContainer: ProducerContainer
}) => {


    return (
        <div className="relative bottom-0 flex flex-col w-1/2 md:w-1/2 lg:w-1/4">
            <MediaDistributor
                container={producerContainer}
                transportType="producer"
            />
        </div>
    )
}

export default ProducerDistributor
