import { Device } from "mediasoup-client"
import { RtpCapabilities } from "mediasoup-client/lib/RtpParameters"
import { Transport } from "mediasoup-client/lib/Transport"
import { useEffect, useState } from "react"
import { Socket } from "socket.io-client"
import { UserMeta } from "../types"
import useConsumerTransport from "./useConsumerTransport"
import useMonitorConnection from "./useMonitorConnection"
import useProducerTransport from "./useProducerTransport"

const useConnectToMediasoup = ({
   socket,
   userMeta,
   roomId,
}: {
   socket: Socket
   userMeta: UserMeta
   roomId: string
}) => {
   const [mediaSoupDevice, setMediaSoupDevice] = useState<Device | null>(null)
   const {
      producerTransport,
      closeProducerTransport,
      initializeProducerTransport,
   } = useProducerTransport({
      userMeta,
      roomId,
      socket,
      device: mediaSoupDevice,
   })
   const {
      consumerTransport,
      closeConsumerTransport,
      initializeConsumerTransport,
   } = useConsumerTransport({
      userMeta,
      roomId,
      socket,
      device: mediaSoupDevice,
   })
   const connectionStatus = useMonitorConnection({ socket, consumerTransport })
   const [errors, setErrors] = useState({})

   //Create transport for producer and consumer
   const initializeClientTransports = async (
      socket: Socket,
      device: Device,
   ) => {
      try {
         if (!producerTransport) {
            await initializeProducerTransport()
         }
         if (!consumerTransport) {
            await initializeConsumerTransport()
         }
      } catch (e) {
         console.log(`Failed to initialize transports for ${userMeta.name}`)
      }
   }

   //Create device and initialize it.
   //A Device is an endpoint that connects to a Router to send/receive media
   //Only one device is needed per connection
   const loadAndSetDevice = async (
      routerRtpCapabilities: RtpCapabilities,
   ): Promise<Device> => {
      const device = new Device()
      await device.load({ routerRtpCapabilities })
      setMediaSoupDevice(device)
      return device
   }

   useEffect(() => {
      //When device is set, we initialize transports
      if (mediaSoupDevice) {
         initializeClientTransports(socket, mediaSoupDevice)
      }
      return () => {}
   }, [mediaSoupDevice])

   // Request RouterRTPCapabilities from mediasoup Router, so we can create and endpoint (Device)
   const requestRouterRTPCapabilities = async () =>
      new Promise((resolve, reject) => {
         //incase we're reconnecting, close existing transports
         if (producerTransport || consumerTransport) {
            console.log("Closing existing transports")
            closeProducerTransport()
            closeConsumerTransport()
         }
         socket.emit(
            "requestRouterRTPCapabilities",
            { roomId, userMeta },
            async (response: any) => {
               if (response.Status === "success") {
                  const {
                     routerRtpCapabilities,
                  }: { routerRtpCapabilities: RtpCapabilities } = response
                  try {
                     await loadAndSetDevice(routerRtpCapabilities)
                     resolve({})
                  } catch (e) {
                     setErrors({ ...errors, DeviceError: true })
                     console.log("Unable to load device")
                     reject("Unable to load device")
                  }
               } else {
                  setErrors({ ...errors, RTPCapabilitiesPayload: true })
                  console.log("Unable to request router's RTP capabilities")
                  reject("Unable to load device")
               }
            },
         )
      })

   // Abstracted connection promise
   const connectToRoom = requestRouterRTPCapabilities

   return {
      connectionStatus,
      producerTransport,
      consumerTransport,
      initializeProducerTransport,
      initializeConsumerTransport,
      closeProducerTransport,
      closeConsumerTransport,
      mediaSoupDevice,
      connectToRoom,
      errors,
   }
}

export default useConnectToMediasoup
