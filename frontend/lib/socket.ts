import { createContext } from "react"
import { io, Socket } from "socket.io-client"
import { SERVER_BASE_URL } from "../config"

export const socket: Socket = io(SERVER_BASE_URL, {
   path: "/server/",
   secure: true,
   // withCredentials: false,
   rejectUnauthorized: false, // set to false only if you use self-signed certificate !
})

export const SocketContext = createContext<Socket>(socket)

// with jwt tokens
// const getSocket = () => {
//    const token = getAuthToken() // get jwt token from local storage or cookie
//    if (token) {
//       return socketio.connect(SOCKET_URL, {
//          query: { token },
//       })
//    }
//    return socketio.connect(SOCKET_URL)
// }

// in socket server, to get jwt tokens
// import SocketIO from "socket.io"

// const io = new SocketIO.Server(expressApp)
// const jwtMiddleware = (socket, next) => {
//    const { token } = socket.handshake.query
//    // verify token
// }

// io.use(jwtMiddleware)
