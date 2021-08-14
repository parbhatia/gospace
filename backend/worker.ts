import * as mediasoup from "mediasoup"
import { Worker, Router } from "mediasoup/lib/types"
import config from "./config/mediasoup"
import { RtpCodecCapability } from "mediasoup/lib/RtpParameters"

// A mediasoup Router can be thought of as a Room. It belongs to a single worker
class Room {
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
}

// A single Worker contains multiple Routers
class WorkerFactory {
   numWorkers: number
   workers: Array<Worker> = []
   availableWorkerIdx = 0
   constructor(numWorkers: number = config.mediasoup.numWorkers) {
      this.numWorkers = numWorkers
   }
   init = async () => {
      await this.createMultipleWorkers()
   }
   createWorker = async (): Promise<Worker> => {
      const worker: Worker = await mediasoup.createWorker({
         logLevel: config.mediasoup.worker.logLevel,
         logTags: config.mediasoup.worker.logTags,
         rtcMinPort: config.mediasoup.worker.rtcMinPort,
         rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
      })
      worker.on("died", (error) => {
         console.error("Worker died!: %o", worker.pid, error)
      })
      return worker
   }
   createMultipleWorkers = async () => {
      for (let count = 0; count < this.numWorkers; ++count) {
         const newWorker = await this.createWorker()
         this.workers.push(newWorker)
      }
   }
   getAvailableWorker = (): Worker => {
      const nextWorker: Worker = this.workers[this.availableWorkerIdx]
      this.availableWorkerIdx++
      return nextWorker
   }
   getAllWorkers = (): Array<Worker> => this.workers
}

export { WorkerFactory, Room }
