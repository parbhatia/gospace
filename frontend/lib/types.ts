import { Consumer } from "mediasoup-client/lib/Consumer"
import { Producer } from "mediasoup-client/lib/Producer"
import { RtpParameters } from "mediasoup-client/lib/RtpParameters"
export interface ConsumeServerConsumeParams {
   id: string
   kind: "audio" | "video"
   rtpParameters: RtpParameters
   producerId: string
   appData: any
}

export interface Size {
   width: number | undefined
   height: number | undefined
}

export type DataProducerOrConsumerType = "canvas" | "text" | "any"

export type TransportDataType = "video" | "audio"

export type TransportType = "producer" | "consumer"

export type ProducerUpdateType = "close" | "pause" | "resume"
export type ConsumerUpdateType = "close" | "pause" | "resume"
export type DataConsumerUpdateType = "close" | "pause" | "resume"
export type DataProducerUpdateType = "close" | "pause" | "resume"

export interface ConsumerContainer {
   id: string //this is the peerId from whom we are consuming from
   name: string
   audio?: {
      mediaStream: MediaStream
      consumer: Consumer
   } | null
   video?: {
      mediaStream: MediaStream
      consumer: Consumer
   } | null
}

export interface ProducerContainer {
   id: string
   name: string
   audio?: {
      mediaStream: MediaStream
      producer: Producer
   } | null
   video?: {
      mediaStream: MediaStream
      producer: Producer
   } | null
}
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
   dateCreated: string
}
export interface UserMeta {
   id: string
   name: string
}
