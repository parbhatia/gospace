import { createWorker } from "mediasoup"
import type { Worker, WorkerResourceUsage } from "mediasoup/lib/types"
import config from "./config/mediasoup"
import debugm from "debug"
const debug = debugm("app:WorkerFactory")

// A single Worker contains multiple Routers
interface WorkerFactoryConstructParams {
   numWorkers?: number
}
class WorkerFactory {
   private numWorkers: number
   private workers: Array<Worker> = []
   private availableWorkerIdx = 0
   private constructor({
      numWorkers = config.mediasoup.numWorkers,
   }: WorkerFactoryConstructParams) {
      this.numWorkers = numWorkers
   }
   static init = async (): Promise<WorkerFactory> => {
      const me = new WorkerFactory({ })
      await me.createAllWorkers()
      return me
   }
   createWorker = async (): Promise<Worker> => {
      const worker: Worker = await createWorker({
         logLevel: config.mediasoup.worker.logLevel,
         logTags: config.mediasoup.worker.logTags,
         rtcMinPort: config.mediasoup.worker.rtcMinPort,
         rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
      })
      worker.on("died", (error) => {
         debug("Worker died!: %o", worker.pid, error)
      })
      return worker
   }
   createAllWorkers = async () => {
      for (let count = 0; count < this.numWorkers; ++count) {
         const newWorker = await this.createWorker()
         this.workers.push(newWorker)
      }
   }
   getAvailableWorkerResourceUsage = async (): Promise<WorkerResourceUsage> =>
      await this.getAvailableWorker().getResourceUsage()

   getWorkerResourceUsage = async ({
      workerPID,
   }: {
      workerPID: number
   }): Promise<WorkerResourceUsage | null> => {
      const worker = this.workers.filter((w) => w.pid === workerPID)[0]
      if (worker) {
         return worker.getResourceUsage()
      }
      return null
   }

   //this is where we would schedule get workers to create routers on based on worker's CPU util
   // in this case, we just use round robin
   getAvailableWorker = (): Worker => {
      const nextWorker: Worker = this.workers[this.availableWorkerIdx]
      if (this.availableWorkerIdx === this.workers.length - 1) {
         this.availableWorkerIdx = 0
      } else {
         ++this.availableWorkerIdx
      }
      return nextWorker
   }
   getAllWorkers = (): Array<Worker> => this.workers
}

export default WorkerFactory
