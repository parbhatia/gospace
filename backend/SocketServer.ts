import type { Server as HttpsServer } from 'https'
import type { Socket } from "socket.io"
import type RoomFactory from "./RoomFactory"
import { Server } from "socket.io"
import addConsumer from "./helpers/socket/addConsumer"
import addDataConsumer from "./helpers/socket/addDataConsumer"
import addDataProducer from "./helpers/socket/addDataProducer"
import addProducer from "./helpers/socket/addProducer"
import connectTransport from "./helpers/socket/connectTransport"
import consumeExistingDataProducers from "./helpers/socket/consumeExistingDataProducers"
import consumeExistingProducers from "./helpers/socket/consumeExistingProducers"
import consumerUpdate from "./helpers/socket/consumerUpdate"
import dataConsumerUpdate from "./helpers/socket/dataConsumerUpdate"
import dataProducerUpdate from "./helpers/socket/dataProducerUpdate"
import debugSocket from "./helpers/socket/debug"
import disconnect from "./helpers/socket/disconnect"
import producerUpdate from "./helpers/socket/producerUpdate"
import removePeer from "./helpers/socket/removePeer"
import removeRoom from "./helpers/socket/removeRoom"
import requestCreateWebRtcTransport from "./helpers/socket/requestCreateWebRtcTransport"
import requestRouterRTPCapabilities from "./helpers/socket/requestRouterRTPCapabilities"
import transportUpdate from "./helpers/socket/transportUpdate"


const createSocketServer = (server: HttpsServer) => {
    const newSocketServer = new Server(server, {
        path: "/server/",
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            // credentials: false,
        },
    })
    return newSocketServer
}

const monitorSocketEvents = async (socketServer: Server, roomFactory: RoomFactory) => {

    // TO DO: create a status interface, which always has a "Status:" : "failure" |"success, and any other keys
    socketServer.on("connection", async (socket: Socket) => {

        //Dependency injection
        requestRouterRTPCapabilities({ socket, roomFactory })
        requestCreateWebRtcTransport({ socket, roomFactory })
        connectTransport({ socket, roomFactory })

        addProducer({ socket, roomFactory })
        addConsumer({ socket, roomFactory })
        transportUpdate({ socket, roomFactory })
        producerUpdate({ socket, roomFactory })
        consumerUpdate({ socket, roomFactory })
        dataProducerUpdate({ socket, roomFactory })
        dataConsumerUpdate({ socket, roomFactory })

        consumeExistingProducers({ socket, roomFactory })
        consumeExistingDataProducers({ socket, roomFactory })

        addDataProducer({ socket, roomFactory })
        addDataConsumer({ socket, roomFactory })

        removePeer({ socket, roomFactory })
        removeRoom({ socket, roomFactory })

        debugSocket({ socket, roomFactory })
        disconnect({ socket, roomFactory })

    })
}

export { createSocketServer, monitorSocketEvents }