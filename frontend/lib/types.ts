import { RtpParameters } from "mediasoup-client/lib/RtpParameters"
export interface ConsumeServerConsumeParams {
   id: string
   kind: "audio" | "video"
   rtpParameters: RtpParameters
   producerId: string
   appData: any
}

export type DataProducerOrConsumerType = "canvas" | "text" | "any"

export type TransportDataType = "video" | "audio"

export type ProducerUpdateType = "close" | "pause" | "resume"
export type ConsumerUpdateType = "close" | "pause" | "resume"
export type DataConsumerUpdateType = "close" | "pause" | "resume"
export type DataProducerUpdateType = "close" | "pause" | "resume"
export interface DataConsumerInput {
   dataConsumerType: DataProducerOrConsumerType
   dataConsumerId: string | null
}

export interface DataProducerInput {
   dataProducerType: DataProducerOrConsumerType
   dataProducerId: string | null
}
export interface RoomInfo {
   totalPeers: number
   name: string
   id: string
}
export interface UserMeta {
   id: string
   name: string
}
