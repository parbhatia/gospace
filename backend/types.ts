import {
   DtlsParameters,
   IceCandidate,
   IceParameters,
   RtpParameters,
   SctpParameters,
   SctpStreamParameters,
} from "mediasoup/lib/types"

export interface UserMeta {
   id: string
   name: string
}

export interface RoomInfo {
   totalPeers: number
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
