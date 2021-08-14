import express from "express"
import { createServer } from "http"
import { Server, Socket } from "socket.io"
import { serverPort } from "./config/index"
import { createMultipleWorkers } from "./worker"

let mediasoupRouter

const initMediasoup = async () => {
   try {
      mediasoupRouter = await createMultipleWorkers()
   } catch (e) {
      throw e
   }
}
initMediasoup()

const main = async () => {
   const app = express()
   const server = createServer(app)
   const io = new Server(server)
   const port: number = serverPort
   io.on("connection", async (socket: Socket) => {
      console.log("Socket connected! :D")

      socket.on("disconnect", function () {
         console.log("A user disconnected :(")
      })
   })
   server.listen(port, () => {
      console.log(`Server started on port ${port}`)
   })
}

export default main
