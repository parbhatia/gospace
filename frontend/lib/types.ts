import { RtpParameters } from "mediasoup-client/lib/RtpParameters"
export interface ConsumeServerConsumeParams {
   id: string
   kind: "audio" | "video"
   rtpParameters: RtpParameters
   producerId: string
   appData: any
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
