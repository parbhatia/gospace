import { Device } from "mediasoup-client"
import { useRef, useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"
import { SERVER_BASE_URL } from "../config"
import { RtpCapabilities } from "mediasoup-client/lib/RtpParameters"
import { Transport } from "mediasoup/lib/types"
import {
   DtlsParameters,
   IceCandidate,
   IceParameters,
   TransportOptions,
} from "mediasoup-client/lib/Transport"
import { Producer } from "mediasoup-client/lib/Producer"

export default function Home() {
   const videoRef: any = useRef()
   const socketRef: any = useRef()
   const deviceRef: any = useRef()
   const [deviceConnected, setDeviceConnected] = useState(false)
   const [userMeta, setUserMeta] = useState({
      id: "1234",
      name: "kvothe",
   })
   const [socketConnected, setSocketConnected] = useState(false)
   const [roomId, setRoomId] = useState("my-room")
   //  const [videoProducer, setVideoProducer]: Transport = useState()
   const [producing, setProducing] = useState(false)
   const [errors, setErrors] = useState({})
   const [stream, setStream] = useState<MediaStream>()
   const producerTransport = useRef<Transport>()
   const consumerTransport = useRef<Transport>()
   const videoProducer = useRef<Transport>()
   const audioProducer = useRef<Transport>()
   const producers = useRef<Array<Transport>>([])
   const consumers = useRef<Array<Transport>>([])

   const monitorProducerTransport = () => {
      if (!producerTransport.current)
         throw new Error("Producer Transport Invalid")
      const pt: Transport = producerTransport.current
      pt.on("connect", async ({ dtlsParameters }, callback, errback) => {
         // Signal local DTLS parameters to the server side transport.
         console.log("transport.connect happened")
         try {
            socketRef.current.emit(
               "connectTransport",
               {
                  userMeta,
                  roomId,
                  transportId: pt.id,
                  dtlsParameters,
               },
               (response) => {
                  if (response.Status === "success") {
                     // Tell the transport that parameters were transmitted.
                     callback()
                  } else {
                     throw new Error("Failed transport connect")
                  }
               },
            )
         } catch (error) {
            console.error("Error with transport", error)
            // Tell the transport that something was wrong.
            errback(error)
         }
      })
      pt.on("produce", async (parameters, callback, errback) => {
         // Signal parameters to the server side transport and retrieve the id of
         // the server side new producer.
         try {
            socketRef.current.emit(
               "addProducerTransport",
               {
                  userMeta,
                  roomId,
                  transportId: pt.id,
                  kind: parameters.kind,
                  rtpParameters: parameters.rtpParameters,
                  appData: parameters.appData,
               },
               (response) => {
                  console.log(response)
                  callback()
               },
            )
            //make sure callback() is called in the right scope

            // Let's assume the server included the created producer id in the response
            // data object.
            //  const { id } = data

            // Tell the transport that parameters were transmitted and provide it with the
            // server side producer's id.
            //  callback({ id })
         } catch (error) {
            // Tell the transport that something was wrong.
            errback(error)
         }
      })

      pt.on("connectionstatechange", (state: string) => {
         switch (state) {
            case "connected":
               setProducing(true)
               break
            case "connecting":
               break
            case "failed":
               setErrors({ ...errors, ProducingFailed: true })
               setProducing(false)
               pt.close()
               break
            default:
               setProducing(false)
         }
      })
   }

   const createMediaStream = async (
      mediaConstraints: MediaStreamConstraints,
   ): Promise<MediaStream> => {
      return navigator.mediaDevices.getUserMedia(mediaConstraints)
   }

   const initProduceMedia = async (
      mediaConstraints: MediaStreamConstraints,
   ) => {
      try {
         const stream: MediaStream = await createMediaStream(mediaConstraints)
         videoRef.current.srcObject = stream
         videoRef.current.muted = true
         const track = stream.getVideoTracks()[0]
         console.log(track)
         console.log(producerTransport.current)
         const producer = await producerTransport.current.produce({
            track,
         })
         //  producer.on("trackended", () => {
         //     console.log("trackended")
         //  })

         //  producer.on("transportclose", () => {
         //     console.log("Producer transport close")
         //  })

         //  producer.on("close", () => {
         //     console.log("close")
         //  })
         producers.current.push(producer)
      } catch (err) {
         console.error(err)
      }
   }

   const checkDeviceProduceCapability = (kind: "audio" | "video"): boolean => {
      if (!deviceRef.current || !deviceRef.current.canProduce(kind)) {
         console.log("INVALID DEVICE")
         setErrors({ ...errors, MediaError: true })
         return false
      }
      return true
   }

   // Request RouterRTPCapabilities from mediasoup Router, so we can create and endpoint (Device)
   const requestRouterRTPCapabilities = (socket: Socket) => {
      socket.emit("requestRouterRTPCapabilities", { roomId, userMeta })
   }

   const requestCreateWebRtcTransport = async (
      socket: Socket,
      device: Device,
   ) => {
      socket.emit("requestCreateWebRtcTransport", {
         roomId,
         userMeta,
         //we need these fields later
         //  forceTcp: false,
         //  rtpCapabilities: device.rtpCapabilities,
      })
   }

   const receiveWebRtcTransportParams = async ({
      transportParams,
   }: {
      transportParams: TransportOptions
   }) => {
      console.log("receiveWebRtcTransportParams")
      //Create new transport for sending media to server. At this point a mediasoup server has already created an identical transport with the same transport params
      const transport: Transport =
         deviceRef.current.createSendTransport(transportParams)
      producerTransport.current = transport
      monitorProducerTransport()
   }

   //Create device and initialize it.
   //A Device is an endpoint that connects to a Router to send/receive media
   const loadDevice = async (
      routerRtpCapabilities: RtpCapabilities,
   ): Promise<Device> => {
      const device = new Device()
      deviceRef.current = device
      await device.load({ routerRtpCapabilities })
      setDeviceConnected(true)
      return device
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
            try {
               const routerRtpCapabilities = msg
               const device = await loadDevice(routerRtpCapabilities)
               await requestCreateWebRtcTransport(socket, device)
            } catch (e) {
               setErrors({ ...errors, RTPCapabilitiesPayload: true })
            }
         })
         socket.on("receiveWebRtcTransportParams", async (msg: any) => {
            const producerTransportParams = msg
            await receiveWebRtcTransportParams({
               transportParams: producerTransportParams,
            })
         })
         socket.on("newProducer", (msg: any) => {
            const {
               peerId,
               producerTransportId,
            }: { peerId: string; producerTransportId: string } = msg
            //since room broadcasts new producers to everyone, ignore this request for self join
            if (userMeta.id !== peerId) {
            }
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
            {producing ? (
               <div className="lg bg-green-500">PRODUCING</div>
            ) : (
               <div className="lg bg-red-500">NOT PRODUCING</div>
            )}
            <h4>Errors:</h4>
            <div>{JSON.stringify(errors)}</div>
            <div>
               <button
                  onClick={async () => {
                     if (checkDeviceProduceCapability("video")) {
                        await initProduceMedia({
                           video: true,
                        })
                     }
                  }}
                  disabled={videoProducer.current}
               >
                  Produce Video
               </button>
            </div>
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
