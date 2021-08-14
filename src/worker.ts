import * as mediasoup from "mediasoup"
import { Worker, Router } from "mediasoup/lib/types"
import config from "./config/mediasoup"
interface WorkerType {
   worker: Worker
   router: Router
}

const availableWorkerCount = config.mediasoup.numWorkers
const workers: Array<Worker> = []
let nextWorkerIdx = 0

const createWorker = async (): Promise<Worker> => {
   const worker = await mediasoup.createWorker({
      logLevel: config.mediasoup.worker.logLevel,
      logTags: config.mediasoup.worker.logTags,
      rtcMinPort: config.mediasoup.worker.rtcMinPort,
      rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
   })
   worker.on("died", (error) => {
      console.error("mediasoup worker died!: %o", worker.pid, error)
   })
   return worker
}

const createMultipleWorkers = async () => {
   for (let count = 0; count < availableWorkerCount; ++count) {
      const newWorker = await createWorker()
      workers.push(newWorker)
   }
}

export { createMultipleWorkers }
