import { Device } from "mediasoup-client"
import { Transport } from "mediasoup-client/lib/Transport"
import { Socket } from "socket.io-client"
import { UserMeta } from "../types"

const requestCreateWebRtcTransport = async ({
   roomId,
   userMeta,
   socket,
   device,
   transportType,
}: {
   roomId: string
   userMeta: UserMeta
   socket: Socket
   device: Device
   transportType: "producer" | "consumer"
}): Promise<Transport> => {
   return new Promise((resolve, reject) => {
      if (device && socket) {
         socket.emit(
            "requestCreateWebRtcTransport",
            {
               roomId,
               userMeta,
               transportType,
            },
            async (response: any) => {
               if (response.Status === "success") {
                  const { transportParams } = response
                  if (transportType === "producer") {
                     //Create new transport for sending media to server. At this point a mediasoup server has already created an identical transport with the same transport param
                     const newProducerTransport: Transport =
                        device.createSendTransport(transportParams)
                     resolve(newProducerTransport)
                  } else {
                     //Create new transport for receiving media from server. At this point a mediasoup server has already created an identical transport with the same transport params
                     const newConsumerTransport: Transport =
                        device.createRecvTransport(transportParams)
                     resolve(newConsumerTransport)
                  }
               } else {
                  reject("Unable to create transport for " + transportType)
               }
            },
         )
      }
   })
}

export default requestCreateWebRtcTransport
