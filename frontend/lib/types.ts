import { RtpParameters } from "mediasoup-client/lib/RtpParameters"
export interface ConsumeServerConsumeParams {
   id: string
   kind: "audio" | "video"
   rtpParameters: RtpParameters
   producerId: string
   appData: any
}
