import {
   DtlsParameters,
   IceCandidate,
   IceParameters,
   RtpParameters,
   SctpParameters,
   SctpStreamParameters,
} from "mediasoup/lib/types"

export interface HTTPSCredentials {
   key: string
   cert: string
}

export interface UserMeta {
   id: string
   name: string
}

export type PeerEntityType =
   | "Producer"
   | "Consumer"
   | "DataProducer"
   | "DataConsumer"
   | "ProducerTransport"
   | "ConsumerTransport"

export type PeerEntityUpdateType = "close" | "pause" | "resume" | "unpause"

export interface RoomInfo {
   totalPeers: number
   dateCreated: Date
}

export interface ConsumeServerConsumeParams {
   id: string
   kind: "audio" | "video"
   rtpParameters: RtpParameters
   producerId: string
   appData: any
}
export interface ConsumeDataConsumerParams {
   id: string
   dataProducerId: string
   sctpStreamParameters: SctpStreamParameters | undefined
   label: string
   protocol: string
   appData: any
}

export interface WebRtcTransportParams {
   id: String
   iceParameters: IceParameters
   iceCandidates: Array<IceCandidate>
   dtlsParameters: DtlsParameters
   sctpParameters: SctpParameters | undefined
}
