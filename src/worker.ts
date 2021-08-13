import * as mediasoup from "mediasoup"
import { Worker, Router } from "mediasoup/lib/types"
import mediaSoupConfig from "./config/mediasoup"

interface Worker {
   worker: Worker
   router: Router
}

const worker: Array<Worker> = []

let nextWorkerIdx = 0

const createWorker = async () => {
   const worker = await mediasoup.createWorker()
}
