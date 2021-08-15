import { RtpCodecCapability } from "mediasoup/lib/RtpParameters"
import { Router, Worker } from "mediasoup/lib/types"
import config from "./config/mediasoup"
import nanoid from "nanoid"

// const uniqueRoomIdGenerator = nanoid.customAlphabet(
//    "ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz123456789",
//    4,
// )
const uniqueRoomIdGenerator = () => "my-room"

// A mediasoup Router can be thought of as a Room. It belongs to a single worker
class Room {
   id: string
   worker: Worker
   mediaCodecs: RtpCodecCapability[]
   router: Router | null
   constructor({
      worker,
      mediaCodecs = config.mediasoup.router.mediaCodecs,
   }: {
      worker: Worker
      mediaCodecs?: RtpCodecCapability[]
   }) {
      this.worker = worker
      this.mediaCodecs = mediaCodecs
      this.router = null
      this.id = uniqueRoomIdGenerator()
   }
   init = async () => {
      await this.createRouterFromWorker()
   }
   createRouterFromWorker = async () => {
      const router: Router = await this.worker.createRouter({
         mediaCodecs: this.mediaCodecs,
      })
      this.router = router
   }
   getRTPCapabilities = () => {
      return this.router?.rtpCapabilities
   }
   getRouter = () => this.router
   getId = () => this.id
}

export default Room
