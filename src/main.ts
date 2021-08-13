import express from "express"
import { createServer } from "http"
import { Server, Socket } from "socket.io"

const main = async () => {
   const app = express()
   const server = createServer(app)
   const io = new Server(server)
   const port: number = 4000
   io.on("connection", (socket: Socket) => {
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
