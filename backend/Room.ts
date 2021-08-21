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
   removeRoom: any
}
// A mediasoup Router can be thought of as a Room. It belongs to a single worker
class Room {
   private id: string
   private router: Router
   private peers: Map<string, Peer>
   private removeRoom
   constructor({ id, router, removeRoom }: RoomConstructParams) {
      this.id = id
      this.router = router
      this.peers = new Map()
      this.removeRoom = removeRoom
   }
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
         room: this,
      })
      this.addPeer(newPeer)
      return newPeer
   }
   addPeer = (peer: Peer) => {
      this.peers.set(peer.getUserMeta().id, peer)
      console.log(`Peer ${peer.getUserMeta().name} added to room ${this.id}`)
   }
   getPeer = (userMeta: UserMeta): Peer => this.peers.get(userMeta.id)!
   getPeers = (): Map<string, Peer> => this.peers
   hasPeer = (userMeta: UserMeta): boolean => this.peers.has(userMeta.id)

   //Peer's producer has closed, so close all consumers of peers in room that are consuming this producer
   removeConsumers = ({
      userMeta,
      producerId,
   }: {
      userMeta: UserMeta
      producerId: string
   }) => {
      console.log(`Room is removing consumers of ${userMeta.name}`)
      this.peers.forEach((peer, peerId) => {
         if (userMeta.id !== peerId) {
            peer.removeConsumerOfProducer({ producerId })
         }
      })
   }
   removePeer = async (userMeta: UserMeta, removeEmptyRoom: boolean = true) => {
      if (this.hasPeer(userMeta)) {
         const peerToRemove = this.getPeer(userMeta)
         await peerToRemove.closeTransports()
         this.peers.delete(userMeta.id)
         console.log(`Removing peer ${userMeta.name} from room`)
         if (this.peers.size === 0 && removeEmptyRoom) {
            this.removeRoom(this.id)
         }
      }
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
   debug = async () => {
      console.log(`Room ${this.id} has ${this.peers.size} peers`)
      this.peers.forEach((p, i) => {
         console.log(`${i} : ${p.getUserMeta().name}`)
      })
      console.log("")
   }
}

export default Room
