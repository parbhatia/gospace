import { RtpCodecCapability } from "mediasoup/lib/RtpParameters"
import { Router, Worker, Transport } from "mediasoup/lib/types"
import config from "./config/mediasoup"
import WorkerFactory from "./WorkerFactory"
import Peer from "./Peer"
import { UserMeta } from "./types"
import { io } from "./main"

// const uniqueRoomIdGenerator = nanoid.customAlphabet(
//    "ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz123456789",
//    4,
// )
const uniqueRoomIdGenerator = () => "my-room"

const allRooms: Map<string, Room> = new Map()

const roomExists = (roomId: string): boolean => {
   return allRooms.has(roomId)
}

const createNewRoom = async (workerFactory: WorkerFactory): Promise<Room> => {
   const newRoom = await Room.init({
      worker: workerFactory.getAvailableWorker(),
   })
   allRooms.set(newRoom.getId(), newRoom)
   return newRoom
}

const createDefaultRooms = async (WorkerFactory: WorkerFactory) => {}
interface RouterConstructParams {
   worker: Worker
   mediaCodecs: RtpCodecCapability[]
}

interface RoomConstructParams extends RouterConstructParams {
   router: Router
   mediaCodecs: RtpCodecCapability[]
}
// A mediasoup Router can be thought of as a Room. It belongs to a single worker
class Room {
   private id: string
   private worker: Worker
   private mediaCodecs: RtpCodecCapability[]
   private router: Router
   private peers: Map<string, Peer>
   private constructor({ worker, mediaCodecs, router }: RoomConstructParams) {
      this.worker = worker
      this.mediaCodecs = mediaCodecs
      this.router = router
      this.id = uniqueRoomIdGenerator()
      this.peers = new Map()
   }
   static init = async ({ worker }: { worker: Worker }): Promise<Room> => {
      const defaultMediaCodecs = config.mediasoup.router.mediaCodecs
      const router: Router = await Room.createRouterFromWorker({
         worker,
         mediaCodecs: defaultMediaCodecs,
      })
      const me = new Room({ worker, mediaCodecs: defaultMediaCodecs, router })
      return me
   }
   private static createRouterFromWorker = async ({
      worker,
      mediaCodecs,
   }: RouterConstructParams) => {
      const router: Router = await worker.createRouter({
         mediaCodecs: mediaCodecs,
      })
      return router
   }
   getRTPCapabilities = () => {
      return this.router.rtpCapabilities
   }
   getRouter = () => this.router
   getWorker = () => this.worker
   getId = () => this.id
   createPeer = async ({ userMeta }: { userMeta: UserMeta }): Promise<Peer> => {
      const router: Router = this.getRouter()
      const newPeer: Peer = await Peer.init({
         userMeta,
         router,
      })
      this.addPeer(newPeer)
      this.broadcastFrom(newPeer)
      return newPeer
   }
   addPeer = (peer: Peer) => this.peers.set(peer.getUserMeta().id, peer)
   getPeer = (userMeta: UserMeta): Peer => this.peers.get(userMeta.id)!
   broadcastFrom = (peer: Peer) => {
      // room notifies all peers that new peer has been added a producer, and peers should start consuming
      const peerId = peer.getUserMeta().id
      io.to(this.id).emit("newProducer", {
         peerId: peerId,
         producerTransportId: peer.getProducerTransport({ id: peerId }),
      })
   }
}

export default Room
export { allRooms, roomExists, createNewRoom, createDefaultRooms }
