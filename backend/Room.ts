import type { Router } from "mediasoup/lib/types"
import type { Socket } from "socket.io"
import sendRoomUpdate from "./helpers/sendRoomUpdate"
import Peer from "./Peer"
import type { RoomInfo, UserMeta } from "./types"
import debugm from "debug"
const debug = debugm("app:Room")
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
   private dateCreated
   constructor({ id, router, removeRoom }: RoomConstructParams) {
      this.id = id
      this.router = router
      this.peers = new Map()
      this.removeRoom = removeRoom
      this.dateCreated = new Date()
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
   addPeer = async (peer: Peer) => {
      this.peers.set(peer.getUserMeta().id, peer)
      debug(`Peer ${peer.getUserMeta().name} added to room ${this.id}`)
      await this.broadcastRoomInfoToAll()
   }
   getPeer = (userMeta: UserMeta): Peer => this.peers.get(userMeta.id)!
   getPeers = (): Map<string, Peer> => this.peers
   hasPeer = (userMeta: UserMeta): boolean => this.peers.has(userMeta.id)
   getDateCreated = () => this.dateCreated

   //Peer's producer has closed, so close all consumers of peers in room that are consuming this producer
   removeConsumers = ({
      userMeta,
      producerId,
   }: {
      userMeta: UserMeta
      producerId: string
   }) => {
      debug(`Room is removing consumers of ${userMeta.name}`)
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
         debug(`Removing peer ${userMeta.name} from room`)
         if (this.peers.size === 0 && removeEmptyRoom) {
            this.removeRoom(this.id)
         }
         await this.broadcastRoomInfoToAll()
      }
   }
   removePeerWithSocket = async (socket: Socket) => {
      this.peers.forEach(async (p) => {
         if (p.getSocket().id === socket.id) {
            await this.removePeer(p.getUserMeta())
         }
      })
      await this.broadcastRoomInfoToAll()
   }
   removeAllPeers = async () => {
      //Convert to Promise.all later
      this.peers.forEach(async (peerToRemove, peerId) => {
         await this.removePeer(peerToRemove.getUserMeta())
      })
   }
   getRoomInfoForClient = async (): Promise<RoomInfo> => {
      return {
         totalPeers: this.peers.size,
         dateCreated: this.getDateCreated(),
      }
   }
   broadcastRoomInfoToAll = async () => {
      this.peers.forEach(async (p) => {
         await sendRoomUpdate({
            socket: p.getSocket(),
            room: this,
         })
      })
   }

   debug = async () => {
      debug(`Room ${this.id} has ${this.peers.size} peers`)
      this.peers.forEach((p, i) => {
         debug(`${i} : ${p.getUserMeta().name}`)
      })
      debug("")
   }
}

export default Room
