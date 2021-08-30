import Room from "./Room"
import WorkerFactory from "./WorkerFactory"
import type { Router, Worker, RtpCodecCapability } from "mediasoup/lib/types"
import config from "./config/mediasoup"
import debugm from "debug"
const debug = debugm("app:RoomFactory")

// const uniqueRoomIdGenerator = nanoid.customAlphabet(
//    "ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz123456789",
//    4,
// )
const uniqueRoomIdGenerator = () => "my-room"

//Responsible for delegating rooms to workers and creating new rooms based on worker availability
class RoomFactory {
   private roomToWorker: Map<string, number>
   private rooms: Map<String, Room>
   private workerFactory: WorkerFactory
   private constructor({ workerFactory }: { workerFactory: WorkerFactory }) {
      this.rooms = new Map()
      this.roomToWorker = new Map()
      this.workerFactory = workerFactory
   }
   getRoomWorkerPid = (roomId: string) => this.roomToWorker.get(roomId)
   getAllRooms = () => this.rooms
   getRoom = (roomId: string) => this.rooms.get(roomId)
   removeRoom = async (roomId: string) => {
      if (this.roomExists(roomId)) {
         await this.getRoom(roomId)?.removeAllPeers()
         debug("Removing room", roomId)
         this.rooms.delete(roomId)
         this.roomToWorker.delete(roomId)
      }
   }
   roomExists = (roomId: string): boolean => {
      return this.rooms.has(roomId)
   }
   static init = async (): Promise<RoomFactory> => {
      const workerFactory = await WorkerFactory.init()
      const me = new RoomFactory({ workerFactory })
      return me
   }

   createNewRoom = async (): Promise<Room | undefined> => {
      try {
         const defaultMediaCodecs = config.mediasoup.router.mediaCodecs
         const worker = this.workerFactory.getAvailableWorker()
         if (!worker) {
            throw new Error("Worker is not defined")
         }
         const router: Router = await worker.createRouter({
            mediaCodecs: defaultMediaCodecs,
         })
         const newRoomId = uniqueRoomIdGenerator()
         const newRoom = await new Room({
            id: newRoomId,
            router,
            removeRoom: this.removeRoom,
         })
         router.on("workerclose", async () => {
            await this.removeRoom(newRoomId)
         })
         this.roomToWorker.set(newRoom.getId(), worker.pid)
         this.rooms.set(newRoom.getId(), newRoom)
         return newRoom
      } catch (e) {
         debug("Could not create new room")
      }
   }
   createDefaultRooms = async (WorkerFactory: WorkerFactory) => { }
   debug = async ({ roomId }: { roomId: string }) => {
      debug("Worker stats:")
      if (this.roomExists(roomId)) {
         const workerPID = this.getRoomWorkerPid(roomId)!
         const resourceUsage = await this.workerFactory.getWorkerResourceUsage({
            workerPID,
         })
         if (resourceUsage) {
            debug(resourceUsage)
         }
      }
      debug("")
   }
}

export default RoomFactory
