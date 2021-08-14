import { Device } from "mediasoup-client"
import { useRef, useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"
import { SERVER_BASE_URL } from "../config"
import { RtpCapabilities } from "mediasoup-client/lib/RtpParameters"

export default function Home() {
   const videoRef: any = useRef()
   const socketRef: any = useRef()
   const [deviceConnected, setDeviceConnected] = useState(false)
   const [socketConnected, setSocketConnected] = useState(false)

   // Request RouterRTPCapabilities from mediasoup Router, so we can create and endpoint (Device)
   const requestRouterRTPCapabilities = (socket: Socket) => {
      socket.emit("requestRouterRTPCapabilities")
   }

   const requestCreateProducerTransport = (socket: Socket, device: Device) => {
      socket.emit("requestCreateProducerTransport", {
         type: "createProducerTransport",
         forceTcp: false,
         rtpCapabilities: device.rtpCapabilities,
      })
   }

   //Create device and initialize it.
   //A Device is an endpoint that connects to a Router to send/receive media
   const loadDevice = async (
      routerRtpCapabilities: RtpCapabilities,
   ): Promise<Device> => {
      const device = new Device()
      try {
         await device.load({ routerRtpCapabilities })
         setDeviceConnected(true)
      } catch (e) {
         console.log("Error loading device", e)
      } finally {
         return device
      }
   }

   //Establishes connection to socket-io server
   const establishSocketIoConnection = async () => {
      if (socketRef.current == null) {
         const newSocket: Socket = io(SERVER_BASE_URL, {
            path: "/server/",
         })
         socketRef.current = newSocket
      }
      return new Promise((resolve, reject) => {
         const socket = socketRef.current
         socket.on("connect", () => {
            console.log("Client connected", socket.id)
            setSocketConnected(true)
            requestRouterRTPCapabilities(socket)
         })
         socket.on("error", (err: any) => {
            //display socket connection notification
            console.error("Client connection error:", err)
            reject(err)
         })
         socket.on("RTPCapabilitiesPayload", async (msg: any) => {
            const routerRtpCapabilities = msg
            const device = await loadDevice(routerRtpCapabilities)
            await requestCreateProducerTransport(socket, device)
         })
         socket.on("message", (msg: any) => {
            console.log("Client received message:", msg)
            // if (msg.type === "welcome") {
            //    if (socket.id !== message.id) {
            //       console.warn(
            //          "WARN: something wrong with clientID",
            //          socket.io,
            //          message.id,
            //       )
            //    }

            //    clientId.current = message.id
            //    console.log("connected to server. clientId=" + clientId.current)
            //    resolve()
            // } else {
            //    console.error("UNKNOWN message from server:", message)
            // }
         })
      })
   }
   const disconnectSocketIoConnection = () => {
      if (socketRef.current) socketRef.current.disconnect()
   }
   useEffect(() => {
      establishSocketIoConnection()
      return () => {
         disconnectSocketIoConnection()
      }
   }, [])
   return (
      <main>
         <div>
            {socketConnected ? (
               <div className="lg bg-green-500">CONNECTED</div>
            ) : (
               <div className="lg bg-red-500">DISCONNECTED</div>
            )}
            {deviceConnected ? (
               <div className="lg bg-green-500">DEVICE CONNECTED</div>
            ) : (
               <div className="lg bg-red-500">DEVICE DISCONNECTED</div>
            )}
            My Video
            <video
               autoPlay
               controls
               playsInline
               ref={videoRef}
               style={{
                  width: "500px",
                  height: "500px",
               }}
            ></video>
         </div>
      </main>
   )
}
