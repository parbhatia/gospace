import { Device } from "mediasoup-client"
import { Consumer } from "mediasoup-client/lib/Consumer"
import {
   DataConsumer,
   DataConsumerOptions,
} from "mediasoup-client/lib/DataConsumer"
import { DataProducer } from "mediasoup-client/lib/DataProducer"
import { Producer } from "mediasoup-client/lib/Producer"
import { RtpCapabilities } from "mediasoup-client/lib/RtpParameters"
import { Transport } from "mediasoup-client/lib/Transport"
import {
   createRef,
   useEffect,
   useRef,
   useState,
   useContext,
   useCallback,
} from "react"
import { io, Socket } from "socket.io-client"
import Link from "next/link"
import { SERVER_BASE_URL } from "../config"
import { ConsumeServerConsumeParams } from "../lib/types"
import { useUserMedia } from "../lib/getUserMedia"
import { socket, SocketContext } from "../lib/socket"

function getRandomInt(max: number) {
   return Math.floor(Math.random() * max)
}

const VideoComponent = ({
   label,
   mediaStream,
}: {
   label: string | null
   mediaStream: MediaStream
}) => {
   const videoRef: any = useRef()
   useEffect(() => {
      videoRef.current.srcObject = mediaStream
      videoRef.current.muted = true
      // return function cleanup() {
      //    console.log("Cleaning mediaStream")
      //    mediaStream.getTracks().forEach((track) => {
      //       track.stop()
      //    })
      // }
   }, [mediaStream])
   useEffect(() => {
      return () => {
         console.log("Cleaning mediaStream")
         mediaStream.getTracks().forEach((track) => {
            track.stop()
         })
      }
   }, [])
   return (
      <div className="border-2">
         <video
            muted
            loop
            autoPlay
            //  controls
            playsInline
            ref={videoRef}
            style={{
               width: "100px",
               height: "100px",
            }}
         ></video>
         {label ? <p>{label}</p> : null}
      </div>
   )
}

export default function Home() {
   const socket = useContext(SocketContext)
   const deviceRef: any = useRef()
   const [deviceConnected, setDeviceConnected] = useState(false)
   const [id] = useState(() => getRandomInt(50).toString())
   const [userMeta, setUserMeta] = useState({
      id: id,
      name: id,
   })
   const [socketConnected, setSocketConnected] = useState(false)
   const [roomId, setRoomId] = useState("my-room")
   //  const [videoProducer, setVideoProducer]: Transport = useState()
   const [producerTransportConnected, setProducerTransportConnected] =
      useState(false)
   const [consumerTransportConnected, setConsumerTransportConnected] =
      useState(false)
   const [producing, setProducing] = useState(false)
   const [errors, setErrors] = useState({})
   const [producerTransport, setProducerTransport] =
      useState<Transport | null>()
   const [consumerTransport, setConsumerTransport] =
      useState<Transport | null>()
   // const producerTransport = useRef<Transport>()
   // const consumerTransport = useRef<Transport>()
   const videoProducer = useRef<Transport>()
   const audioProducer = useRef<Transport>()
   const [producerContainers, setProducerContainers] = useState<
      Array<{ mediaStream: MediaStream; producer: Producer; name: string }>
   >([])
   const [consumerContainers, setConsumerContainers] = useState<
      Array<{
         mediaStream: MediaStream
         consumer: Consumer
         name: string
         id: string
      }>
   >([])
   const dataProducers = useRef<Array<DataProducer>>([])
   const dataConsumers = useRef<Array<DataConsumer>>([])
   const canvasDataProducer = useRef<DataProducer>()
   const remoteVideoRef: any = useRef()

   const closeStream = (stream: MediaStream) => {
      stream.getTracks().forEach((track) => {
         console.log("closing stream track")
         track.stop()
      })
   }

   useEffect(() => {
      if (producerTransport) {
         const pt: Transport = producerTransport
         pt.on("connect", async ({ dtlsParameters }, callback, errback) => {
            // Signal local DTLS parameters to the server side transport.
            try {
               socket.emit(
                  "connectTransport",
                  {
                     userMeta,
                     roomId,
                     transportId: pt.id,
                     dtlsParameters,
                  },
                  (response: any) => {
                     if (response.Status === "success") {
                        // Tell the transport that parameters were transmitted.
                        callback()
                     } else {
                        throw new Error("Failed Producer transport connect")
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
               socket.emit(
                  "addProducerTransport",
                  {
                     userMeta,
                     roomId,
                     transportId: pt.id,
                     kind: parameters.kind,
                     rtpParameters: parameters.rtpParameters,
                     appData: parameters.appData,
                  },
                  (response: any) => {
                     if (response.Status === "success") {
                        const newProducerId = response.id
                        // Tell the transport that parameters were transmitted and provide it with the
                        // server side producer's id.
                        callback({ id: newProducerId })
                     } else {
                        throw new Error("Failed Producer transport connect")
                     }
                  },
               )
            } catch (error) {
               // Tell the transport that something was wrong.
               errback(error)
            }
         })
         pt.on("producedata", async (parameters, callback, errback) => {
            // Signal parameters to the server side transport and retrieve the id of
            // the server side new producer.
            // Note: Data Producers are created using our send transport
            try {
               socket.emit(
                  "addDataProducer",
                  {
                     userMeta,
                     roomId,
                     transportId: pt.id,
                     sctpStreamParameters: parameters.sctpStreamParameters,
                     label: parameters.label,
                     protocol: parameters.protocol,
                  },
                  (response: any) => {
                     if (response.Status === "success") {
                        const newDataProducerId = response.id
                        // Tell the transport that parameters were transmitted and provide it with the
                        // server side producer's id.
                        callback({ id: newDataProducerId })
                     } else {
                        throw new Error("Failed Data Producer connect")
                     }
                  },
               )
            } catch (error) {
               // Tell the transport that something was wrong.
               errback(error)
            }
         })

         pt.on("connectionstatechange", (state: string) => {
            switch (state) {
               case "connected":
                  setProducerTransportConnected(true)
                  break
               case "connecting":
                  break
               case "failed":
                  setErrors({ ...errors, ProducingFailed: true })
                  setProducerTransportConnected(false)
                  pt.close()
                  break
               default:
                  break
            }
         })
         pt.observer.on("close", () => {
            console.log("PT observed transport close")
            socket.emit("producerTransportClosed", {
               userMeta,
               roomId,
               producerTransportId: pt.id,
            })
         })
      }
   }, [producerTransport])

   useEffect(() => {
      if (consumerTransport) {
         const ct: Transport = consumerTransport
         ct.on("connect", async ({ dtlsParameters }, callback, errback) => {
            // Signal local DTLS parameters to the server side transport.
            try {
               socket.emit(
                  "connectTransport",
                  {
                     userMeta,
                     roomId,
                     transportId: ct.id,
                     dtlsParameters,
                  },
                  (response: any) => {
                     if (response.Status === "success") {
                        // Tell the transport that parameters were transmitted.
                        callback()
                     } else {
                        throw new Error("Failed Consumer transport connect")
                     }
                  },
               )
            } catch (error) {
               console.error("Error with transport", error)
               // Tell the transport that something was wrong.
               errback(error)
            }
         })
         ct.on("connectionstatechange", (state: string) => {
            switch (state) {
               case "connected":
                  setConsumerTransportConnected(true)
                  //  socket.emit("resumeConsumerStream")
                  break
               case "connecting":
                  break
               //emit resume consumer stream object
               case "failed":
                  setErrors({ ...errors, ConsumingFailed: true })
                  setConsumerTransportConnected(false)
                  ct.close()
                  break
               default:
                  break
            }
         })
         ct.observer.on("close", () => {
            console.log("CT observed consumer transport close")
            //  consumers.current.forEach((c) => c.close())
            //  consumers.current = []
            //  dataConsumers.current.forEach((dc) => dc.close())
            //  consumers.current = []
         })
      }
   }, [consumerTransport])

   const createProducer = async (mediaConstraints: MediaStreamConstraints) => {
      try {
         const removeProducer = (producerId: string) => {
            // producers.current = producers.current.filter(
            //    (p) => p.id !== producerId,
            // )
            setProducerContainers(
               producerContainers.filter((p) => p.producer.id !== producerId),
            )
         }
         // const handleProducerClosed = (producerId: string) => {
         //    socket.emit("producerClosed", {
         //       userMeta,
         //       roomId,
         //       producerId,
         //    })
         //    removeProducer(producerId)
         // }
         let transport: Transport
         if (!producerTransport) {
            console.log(
               "calling requestCreateWebRtcTransport again for producer transport",
            )
            const newProducerTransport = await requestCreateWebRtcTransport(
               socket,
               deviceRef.current,
               "producer",
            )
            transport = newProducerTransport
            // throw new Error("No producer transport added")
         } else {
            transport = producerTransport
         }
         const stream: MediaStream = await createMediaStream(mediaConstraints)

         // const mediaRef = useRef()
         // if (stream && mediaRef.current && !mediaRef.current.srcObject) {
         //    mediaRef.current.srcObject = stream
         //    mediaRef.current.muted = true
         // }
         // videoRef.current.srcObject = stream
         // videoRef.current.muted = true
         const track = stream.getVideoTracks()[0]
         //  console.log(track)
         const producer = await transport.produce({
            track,
         })
         producer.on("trackended", () => {
            //Emitted when the audio/video track being transmitted is externally stopped
            // console.log("trackended")
            producer.pause()
         })

         //producer will close automatically since transport closed
         producer.on("transportclose", () => {
            console.log("Producer transport closed")
            removeProducer(producer.id)
            closeStream(stream)
            // handleProducerClosed(producer.id)
            // producer.close()
         })

         producer.on("close", () => {
            closeStream(stream)
            console.log("Producer has closed")
         })
         // producers.current.push(producer)
         const newProducerContainer = {
            mediaStream: stream,
            producer,
            name: "",
         }
         setProducerContainers([...producerContainers, newProducerContainer])
      } catch (err) {
         console.log("Transport state", producerTransport)
         console.error(err)
      }
   }

   const createConsumer = async ({
      peerId,
      peerName,
      producerId,
   }: {
      peerId: string
      peerName: string
      producerId: string
   }): Promise<{
      mediaStream: MediaStream
      consumer: Consumer
      name: string
      id: string
   }> => {
      return new Promise(async (resolve, reject) => {
         let transport: Transport
         if (!consumerTransport || !deviceRef || !deviceRef.current) {
            console.log("Create consumer is requesting web rtc transport")
            const newConsumerTransport = await requestCreateWebRtcTransport(
               socket,
               deviceRef.current,
               "consumer",
            )
            transport = newConsumerTransport
         } else {
            transport = consumerTransport
         }
         const { rtpCapabilities } = deviceRef.current

         const removeConsumer = (consumerId: string) => {
            // consumers.current = consumers.current.filter(
            //    (c) => c.id !== consumerId,
            // )
            setConsumerContainers(
               consumerContainers.filter((c) => c.consumer.id !== consumerId),
            )
         }
         // const handleConsumerClosed = (consumerId: string) => {
         //    console.log("handleConsumerClosed ran")
         //    socket.emit("consumerClosed", {
         //       userMeta,
         //       roomId,
         //       consumerId,
         //    })
         //    removeConsumer(consumerId)
         // }
         socket.emit(
            "addConsumerTransport",
            {
               userMeta,
               roomId,
               transportId: transport.id,
               producerId,
               rtpCapabilities,
               appData: {},
               paused: false,
            },
            async (response: any) => {
               // console.log(response)
               if (response.Status !== "success") {
                  throw new Error(
                     "Failed Producer transport connect : " + response.Error,
                  )
               }
               // console.log("Creating new consumer")
               const {
                  id,
                  kind,
                  rtpParameters,
                  producerId,
                  appData,
               }: ConsumeServerConsumeParams = response.newConsumerParams
               const consumer = await transport.consume({
                  id,
                  kind,
                  producerId,
                  rtpParameters,
                  appData,
               })
               const { track }: { track: MediaStreamTrack } = consumer
               const stream: MediaStream = await createMediaConsumerStream(
                  track,
               )
               consumer.on("trackended", () => {})
               //consumer will close automatically, since transport closed
               consumer.on("transportclose", () => {
                  console.log("Consumer transport closed")
                  // handleConsumerClosed(consumer.id)
                  removeConsumer(consumer.id)
                  closeStream(stream)
                  // consumer.close()
               })
               consumer.on("close", () => {
                  closeStream(stream)
                  //  handleConsumerClosed(consumer.id)
               })
               const newConsumerContainer = {
                  mediaStream: stream,
                  consumer,
                  name: peerName,
                  id: peerId,
               }

               resolve(newConsumerContainer)
            },
         )
      })
   }

   const createMediaConsumerStream = async (
      track: MediaStreamTrack,
   ): Promise<MediaStream> => {
      const newStream = new MediaStream([track])
      return newStream
   }

   const createDataProducer = async () => {
      if (!producerTransport) {
         await requestCreateWebRtcTransport(
            socket,
            deviceRef.current,
            "producer",
         )
      } else {
         const newDataProducer = await producerTransport!.produceData()
         canvasDataProducer.current = newDataProducer

         dataProducers.current.push(newDataProducer)
      }
   }

   const createDataConsumer = async ({
      dataProducerId,
   }: {
      dataProducerId: string
   }) => {
      if (!consumerTransport || !consumerTransport) {
         await requestCreateWebRtcTransport(
            socket,
            deviceRef.current,
            "consumer",
         )
         //  throw new Error("Invalid consumer transport")
      }
      await socket.emit(
         "addDataConsumer",
         {
            userMeta,
            roomId,
            transportId: consumerTransport!.id,
            dataProducerId,
         },
         async (response: any) => {
            if (response.Status !== "success") {
               throw new Error(
                  "Failed Data Producer connect : " + response.Error,
               )
            }
            const {
               id,
               sctpStreamParameters,
               label,
               protocol,
               dataProducerId,
            }: DataConsumerOptions = response.newConsumerParams
            const dataConsumer = await consumerTransport!.consumeData({
               id,
               dataProducerId,
               sctpStreamParameters,
               label,
               protocol,
            })
            dataConsumer.on("message", (data) => {
               //data is likely stringified json, might need to parse
               console.log("RECEIVED DATA MESSAGE", data)
            })
            dataConsumers.current.push(dataConsumer)
         },
      )
   }

   const initDataConsume = async ({
      peerId,
      dataProducerId,
   }: {
      peerId: string
      dataProducerId: string
   }) => {
      try {
         await createDataConsumer({ dataProducerId })
      } catch (err) {
         //Show failed to consume data from new data producer message
         console.error(err)
      }
   }

   const initConsumeMedia = async ({
      peerId,
      peerName,
      producerId,
   }: {
      peerId: string
      peerName: string
      producerId: string
   }) => {
      try {
         const newConsumerContainer = await createConsumer({
            peerId,
            peerName,
            producerId,
         })
         // console.log(
         //    "before",
         //    JSON.stringify(consumerContainers.map((c) => c.id)),
         // )
         setConsumerContainers([...consumerContainers, newConsumerContainer])
      } catch (err) {
         console.error("Failed to consume media from producer")
         //Show failed to consume media from new producer message
         console.error(err)
      }
   }

   const createMediaStream = async (
      mediaConstraints: MediaStreamConstraints,
   ): Promise<MediaStream> => {
      return navigator.mediaDevices.getUserMedia(mediaConstraints)
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
   const requestRouterRTPCapabilities = () => {
      socket.emit("requestRouterRTPCapabilities", { roomId, userMeta })
   }

   const requestCreateWebRtcTransport = async (
      socket: Socket,
      device: Device,
      transportType: "producer" | "consumer",
   ): Promise<Transport> => {
      return new Promise((resolve, reject) => {
         socket.emit(
            "requestCreateWebRtcTransport",
            {
               roomId,
               userMeta,
            },
            async (response: any) => {
               if (response.Status === "success") {
                  const { transportParams } = response
                  if (transportType === "producer") {
                     //Create new transport for sending media to server. At this point a mediasoup server has already created an identical transport with the same transport param
                     const newProducerTransport: Transport =
                        device.createSendTransport(transportParams)
                     setProducerTransport(newProducerTransport)
                     resolve(newProducerTransport)
                     // producerTransport.current = newProducerTransport
                     // monitorProducerTransport()
                     //  await createDataProducer()
                  } else {
                     //Create new transport for receiving media from server. At this point a mediasoup server has already created an identical transport with the same transport params
                     const newConsumerTransport: Transport =
                        device.createRecvTransport(transportParams)
                     setConsumerTransport(newConsumerTransport)
                     resolve(newConsumerTransport)
                     // consumerTransport.current = newConsumerTransport
                     // monitorConsumerTransport()
                  }
               } else {
                  reject("Unable to create transport for " + transportType)
               }
            },
         )
      })
   }
   // console.log("consumerContainers", JSON.stringify(consumerContainers))

   //Create device and initialize it.
   //A Device is an endpoint that connects to a Router to send/receive media
   const loadDevice = async (
      routerRtpCapabilities: RtpCapabilities,
   ): Promise<Device> => {
      const device = new Device()
      await device.load({ routerRtpCapabilities })
      deviceRef.current = device
      setDeviceConnected(true)
      return device
   }

   const initializeClientTransports = async (
      socket: Socket,
      device: Device,
   ) => {
      //Create transport for producer and consumer
      await requestCreateWebRtcTransport(socket, device, "producer")
      await requestCreateWebRtcTransport(socket, device, "consumer")
   }

   // const handleConsumerClosed = (consumerId: string) => {
   //    console.log("handleConsumerClosed ran")
   //    socket.emit("consumerClosed", {
   //       userMeta,
   //       roomId,
   //       consumerId,
   //    })
   //    consumers.current = consumers.current.filter((c) => c.id !== consumerId)
   // }

   const closeProducerTransport = () => {
      if (producerTransport) {
         producerTransport.close()
         setProducerTransport(null)
      }
   }
   const closeConsumerTransport = () => {
      if (consumerTransport) {
         consumerTransport.close()
         setConsumerTransport(null)
      }
   }

   const sendData = async ({
      dataProducer,
      data,
   }: {
      dataProducer: DataProducer | undefined
      data: any
   }) => {
      if (dataProducer) {
         await dataProducer.send(JSON.stringify(data))
      }
   }
   const openRoomCanvas = async () => {
      await createDataProducer()
   }

   const closeConsumer = useCallback(
      (msg) => {
         const { id }: { id: string } = msg
         console.log(
            `Client ${userMeta.name} received close consumer request ${id}`,
         )
         consumerContainers.forEach((c) => {
            if (c.consumer.id === id) {
               c.consumer.close()
            }
         })
         setConsumerContainers(
            consumerContainers.filter((c) => c.consumer.id !== id),
         )
      },
      [consumerContainers],
   )

   const newProducer = useCallback(
      async (msg) => {
         const {
            peerId,
            peerName,
            producerId,
         }: { peerId: string; peerName: string; producerId: string } = msg
         //since room broadcasts new producers to everyone, ignore this request for self join, sanity check
         if (userMeta.id !== peerId) {
            console.log(
               `Client received broadcast message for new producer ${peerName}`,
            )
            await initConsumeMedia({ peerId, peerName, producerId })
         }
      },
      [consumerContainers],
   )
   const newDataProducer = useCallback(
      async (msg: any) => {
         const {
            peerId,
            dataProducerId,
         }: { peerId: string; dataProducerId: string } = msg
         //since room broadcasts new producers to everyone, ignore this request for self join, sanity check
         if (userMeta.id !== peerId) {
            console.log(
               "Client received broadcast message for new data producer",
            )
            await initDataConsume({ peerId, dataProducerId })
         }
      },
      [dataConsumers],
   )
   const RTPCapabilitiesPayload = useCallback(
      async (msg: any) => {
         try {
            const routerRtpCapabilities = msg
            const device = await loadDevice(routerRtpCapabilities)
            await initializeClientTransports(socket, device)
         } catch (e) {
            setErrors({ ...errors, RTPCapabilitiesPayload: true })
         }
      },
      [errors, deviceRef],
   )

   const socketConnect = useCallback(() => {
      console.log("Client connected", socket.id)
      setSocketConnected(true)
      requestRouterRTPCapabilities()
   }, [])
   const socketError = useCallback(() => {
      setErrors({ ...errors, SocketConnectionError: true })
   }, [])
   const listenToSockets = () => {
      socket.on("error", socketError)
      socket.on("RTPCapabilitiesPayload", RTPCapabilitiesPayload)
      socket.on("newDataProducer", newDataProducer)
      socket.on("newProducer", newProducer)
      socket.on("closeConsumer", closeConsumer)
   }
   const unListenToSockets = () => {
      // unbind all event handlers used in this component
      socket.off("error", socketError)
      socket.off("RTPCapabilitiesPayload", RTPCapabilitiesPayload)
      socket.off("newDataProducer", newDataProducer)
      socket.off("newProducer", newProducer)
      socket.off("closeConsumer", closeConsumer)
   }
   const closeSocket = () => {
      // consumerTransport.current.close()
      // producerTransport.current.close()
      unListenToSockets()
      // disconnect socket
      socket.emit("removePeer", { userMeta, roomId })
      socket.disconnect()
   }

   useEffect(() => {
      listenToSockets()
      return () => {
         unListenToSockets()
      }
   }, [
      socket,
      socketError,
      RTPCapabilitiesPayload,
      newDataProducer,
      newProducer,
      closeConsumer,
   ])

   useEffect(() => {
      socket.on("connect", socketConnect)
      return closeSocket
   }, [])

   return (
      <SocketContext.Provider value={socket}>
         <main>
            <div>
               <div>{userMeta.name}</div>
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
               {producerTransportConnected ? (
                  <div className="lg bg-green-500">
                     PRODUCER TRANSPORT CONNECTED
                  </div>
               ) : (
                  <div className="lg bg-red-500">
                     PRODUCER TRANSPORT DISCONNECTED
                  </div>
               )}
               {consumerTransportConnected ? (
                  <div className="lg bg-green-500">
                     CONSUMER TRANSPORT CONNECTED
                  </div>
               ) : (
                  <div className="lg bg-red-500">
                     CONSUMER TRANSPORT DISCONNECTED
                  </div>
               )}
               <h4>Errors:</h4>
               <div>{JSON.stringify(errors)}</div>
               <div>
                  <button
                     onClick={async () => {
                        if (checkDeviceProduceCapability("video")) {
                           await createProducer({
                              video: true,
                           })
                        }
                     }}
                  >
                     Produce Video
                  </button>
               </div>
               <div>Producers</div>
               <div>
                  {/* {JSON.stringify(producerContainers.map((p) => p.producer.id))} */}
                  <div>
                     {producerContainers.map((p) => (
                        <div key={p.producer.id}>
                           <VideoComponent
                              label={null}
                              mediaStream={p.mediaStream}
                           />
                           {/* <p>{p.producer.id}</p> */}
                        </div>
                     ))}
                  </div>
               </div>
               <div>
                  <button
                     onClick={async () => {
                        await openRoomCanvas()
                     }}
                  >
                     Open Room Canvas
                  </button>
               </div>
               <div>
                  <button
                     onClick={async () => {
                        await sendData({
                           dataProducer: canvasDataProducer.current,
                           data: {
                              hello: "world",
                           },
                        })
                     }}
                  >
                     Send Data
                  </button>
               </div>
               {/* <div className="flex">
                  <div>
                     My Video
                     <video
                        autoPlay
                        //  controls
                        playsInline
                        ref={videoRef}
                        style={{
                           width: "500px",
                           height: "500px",
                        }}
                     ></video>
                  </div>
               </div> */}
               <div>
                  Learn <a href="/RoomList">Room List!</a>
               </div>

               <div>
                  <button
                     onClick={() => {
                        closeProducerTransport()
                     }}
                  >
                     Disconnect Producer Transport
                  </button>
               </div>
               <div>
                  <button
                     onClick={() => {
                        closeConsumerTransport()
                     }}
                  >
                     Disconnect Consumer Transport
                  </button>
               </div>
               <div>
                  <button
                     onClick={() => {
                        closeSocket()
                     }}
                  >
                     Disconnect
                  </button>
               </div>
               <div>
                  <button
                     onClick={() => {
                        socket.emit("debug", { roomId, userMeta })
                     }}
                  >
                     Debug
                  </button>
               </div>

               <div>Consumers</div>
               <div className="flex">
                  {consumerContainers.map((c, i) => (
                     <div key={i} className="border-2">
                        <VideoComponent
                           label={c.name}
                           mediaStream={c.mediaStream}
                        />
                        {/* <p>{c.consumer.id}</p> */}
                        {/* <p>{c.name}</p> */}
                     </div>
                  ))}
               </div>
               {/* <div>{JSON.stringify(consumerContainers.map((c) => c.id))}</div> */}
            </div>
         </main>
      </SocketContext.Provider>
   )
}
