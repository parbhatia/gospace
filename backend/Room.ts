import { RtpCodecCapability } from "mediasoup/lib/RtpParameters"
import { Router, Worker } from "mediasoup/lib/types"
import { Socket } from "socket.io"
import config from "./config/mediasoup"
import Peer from "./Peer"
import { UserMeta } from "./types"
import WorkerFactory from "./WorkerFactory"
interface RoomConstructParams {
   id: string
   router: Router
}
// A mediasoup Router can be thought of as a Room. It belongs to a single worker
class Room {
   private id: string
   private router: Router
   private peers: Map<string, Peer>
   constructor({ id, router }: RoomConstructParams) {
      this.id = id
      this.router = router
      this.peers = new Map()
   }
   // static init = async ({ worker }: { worker: Worker }): Promise<Room> => {
   //    const defaultMediaCodecs = config.mediasoup.router.mediaCodecs
   //    const router: Router = await Room.createRouterFromWorker({
   //       worker,
   //       mediaCodecs: defaultMediaCodecs,
   //    })

   //    const me = new Room({ worker, mediaCodecs: defaultMediaCodecs, router })
   //    return me
   // }
   // private static createRouterFromWorker = async ({
   //    worker,
   //    mediaCodecs,
   // }: RouterConstructParams) => {
   //    const router: Router = await worker.createRouter({
   //       mediaCodecs: mediaCodecs,
   //    })

   //    return router
   // }
   monitorRouter = () => {
      this.router.on("workerclose", async () => {
         await this.removeAllPeers()
      })
   }
   getRTPCapabilities = () => {
      return this.router.rtpCapabilities
   }
   getRouter = () => this.router
   getId = () => this.id
   createPeer = async ({
      userMeta,
      socket,
   }: {
      userMeta: UserMeta
      socket: Socket
   }): Promise<Peer> => {
      const router: Router = this.getRouter()
      const newPeer: Peer = new Peer({
         userMeta,
         router,
         socket,
         roomId: this.id,
      })
      this.addPeer(newPeer)
      return newPeer
   }
   addPeer = (peer: Peer) => this.peers.set(peer.getUserMeta().id, peer)
   getPeer = (userMeta: UserMeta): Peer => this.peers.get(userMeta.id)!
   hasPeer = (userMeta: UserMeta): boolean => this.peers.has(userMeta.id)
   removePeer = async (userMeta: UserMeta) => {
      const peerToRemove = this.getPeer(userMeta)
      await peerToRemove.closeTransports()
      this.peers.delete(userMeta.id)
      console.log(`Removing peer ${userMeta.name} from room`)
   }
   removePeerWithSocket = async (socket: Socket) => {
      this.peers.forEach(async (p) => {
         if (p.getSocket().id === socket.id) {
            await this.removePeer(p.getUserMeta())
         }
      })
   }
   removeAllPeers = async () => {
      //Convert to Promise.all later
      this.peers.forEach(async (peerToRemove, peerId) => {
         await this.removePeer(peerToRemove.getUserMeta())
      })
   }
}

export default Room
