import * as mediasoup from "mediasoup"
import { Worker } from "mediasoup/lib/types"
import config from "./config/mediasoup"

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

export default WorkerFactory
