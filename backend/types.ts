import {
   DtlsParameters,
   IceCandidate,
   IceParameters,
   RtpParameters,
} from "mediasoup/lib/types"

export interface UserMeta {
   id: string
   name: string
}

export interface ConsumeServerConsumeParams {
   id: string
   kind: "audio" | "video"
   rtpParameters: RtpParameters
   producerId: string
   appData: any
}

export interface WebRtcTransportParams {
   id: String
   iceParameters: IceParameters
   iceCandidates: Array<IceCandidate>
   dtlsParameters: DtlsParameters
}
