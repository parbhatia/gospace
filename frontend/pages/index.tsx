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
import { useEffect, useRef, useState } from "react"
import { io, Socket } from "socket.io-client"
import { SERVER_BASE_URL } from "../config"
import { ConsumeServerConsumeParams } from "../lib/types"

function getRandomInt(max: number) {
   return Math.floor(Math.random() * max)
}

export default function Home() {
   const videoRef: any = useRef()
   const socketRef: any = useRef()
   const deviceRef: any = useRef()
   const [deviceConnected, setDeviceConnected] = useState(false)
   const randomId = getRandomInt(50).toString()
   const [userMeta, setUserMeta] = useState({
      id: randomId,
      name: randomId,
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
   const producerTransport = useRef<Transport>()
   const consumerTransport = useRef<Transport>()
   const videoProducer = useRef<Transport>()
   const audioProducer = useRef<Transport>()
   const producers = useRef<Array<Producer>>([])
   const consumers = useRef<Array<Consumer>>([])
   const dataProducers = useRef<Array<DataProducer>>([])
   const dataConsumers = useRef<Array<DataConsumer>>([])
   const canvasDataProducer = useRef<DataProducer>()
   const remoteVideoRef: any = useRef()

   const monitorProducerTransport = () => {
      if (!producerTransport.current)
         throw new Error("Producer Transport Invalid")
      const pt: Transport = producerTransport.current
      pt.on("connect", async ({ dtlsParameters }, callback, errback) => {
         // Signal local DTLS parameters to the server side transport.
         try {
            socketRef.current.emit(
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
               (response: any) => {
                  if (response.Status === "success") {
                     const newProducerTransportId = response.id
                     // Tell the transport that parameters were transmitted and provide it with the
                     // server side producer's id.
                     callback({ id: newProducerTransportId })
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
            socketRef.current.emit(
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
         //  producers.current.forEach((p) => p.close())
         //  producers.current = []
         //  dataProducers.current.forEach((dp) => dp.close())
         //  dataProducers.current = []
      })
   }

   const monitorConsumerTransport = () => {
      if (!consumerTransport.current)
         throw new Error("Consumer Transport Invalid")
      console.log("Monitoring consumer transport")
      const ct: Transport = consumerTransport.current
      ct.on("connect", async ({ dtlsParameters }, callback, errback) => {
         // Signal local DTLS parameters to the server side transport.
         try {
            socketRef.current.emit(
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
               //  socketRef.current.emit("resumeConsumerStream")
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
         //  console.log("PT observed consumer transport close")
         //  consumers.current.forEach((c) => c.close())
         //  consumers.current = []
         //  dataConsumers.current.forEach((dc) => dc.close())
         //  consumers.current = []
      })
   }

   const createMediaConsumerStream = async (
      track: MediaStreamTrack,
   ): Promise<MediaStream> => {
      const newStream = new MediaStream([track])
      return newStream
   }

   const createDataProducer = async () => {
      if (producerTransport && producerTransport.current) {
         const newDataProducer = await producerTransport.current.produceData()
         canvasDataProducer.current = newDataProducer

         dataProducers.current.push(newDataProducer)
      }
   }

   const createConsumer = async ({ producerId }: { producerId: string }) => {
      if (
         !consumerTransport ||
         !consumerTransport.current ||
         !deviceRef ||
         !deviceRef.current
      ) {
         throw new Error("Invalid consumer transport or device")
      }
      const { rtpCapabilities } = deviceRef.current
      const handleConsumerClosed = (consumerId: string) => {
         consumers.current = consumers.current.filter(
            (c) => c.id !== consumerId,
         )
      }
      await socketRef.current.emit(
         "addConsumerTransport",
         {
            userMeta,
            roomId,
            transportId: consumerTransport.current.id,
            producerId,
            rtpCapabilities,
            appData: {},
            paused: false,
         },
         async (response: any) => {
            console.log(response)
            if (response.Status !== "success") {
               throw new Error(
                  "Failed Producer transport connect : " + response.Error,
               )
            }
            console.log("Creating new consumer")
            const {
               id,
               kind,
               rtpParameters,
               producerId,
               appData,
            }: ConsumeServerConsumeParams = response.newConsumerParams
            const consumer = await consumerTransport.current!.consume({
               id,
               kind,
               producerId,
               rtpParameters,
               appData,
            })
            consumer.on("trackended", () => {})
            consumer.on("transportclose", () => {
               console.log("Consumer transport closed")
               handleConsumerClosed(consumer.id)
               consumer.close()
            })
            consumer.on("close", () => {
               handleConsumerClosed(consumer.id)
            })
            const { track }: { track: MediaStreamTrack } = consumer
            const stream: MediaStream = await createMediaConsumerStream(track)
            remoteVideoRef.current.srcObject = stream
            consumers.current.push(consumer)
         },
      )
   }

   const createDataConsumer = async ({
      dataProducerId,
   }: {
      dataProducerId: string
   }) => {
      if (!consumerTransport || !consumerTransport.current) {
         throw new Error("Invalid consumer transport")
      }
      await socketRef.current.emit(
         "addDataConsumer",
         {
            userMeta,
            roomId,
            transportId: consumerTransport.current.id,
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
            const dataConsumer = await consumerTransport.current!.consumeData({
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
      producerTransportId,
   }: {
      peerId: string
      producerTransportId: string
   }) => {
      try {
         await createConsumer({ producerId: producerTransportId })
      } catch (err) {
         //Show failed to consume media from new producer message
         console.error(err)
      }
   }

   const createMediaStream = async (
      mediaConstraints: MediaStreamConstraints,
   ): Promise<MediaStream> => {
      return navigator.mediaDevices.getUserMedia(mediaConstraints)
   }

   const initProduceMedia = async (
      mediaConstraints: MediaStreamConstraints,
   ) => {
      const handleCloseProducer = (producerId: string) => {
         socketRef.current.emit("producerClosed", {
            userMeta,
            roomId,
            producerId,
         })
         producers.current = producers.current.filter(
            (p) => p.id !== producerId,
         )
      }
      try {
         if (!producerTransport || !producerTransport.current) {
            throw new Error("No producer transport added")
         }
         const stream: MediaStream = await createMediaStream(mediaConstraints)
         videoRef.current.srcObject = stream
         videoRef.current.muted = true
         const track = stream.getVideoTracks()[0]
         //  console.log(track)
         const producer = await producerTransport.current!.produce({
            track,
         })
         producer.on("trackended", () => {
            // console.log("trackended")
            // producer.pause()
         })

         producer.on("transportclose", () => {
            console.log("Producer transport closed")
            handleCloseProducer(producer.id)
            producer.close()
         })

         producer.on("close", () => {
            console.log("Producer has closed")
            handleCloseProducer(producer.id)
         })
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
      transportType: "producer" | "consumer",
   ) => {
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
                  producerTransport.current = newProducerTransport
                  monitorProducerTransport()
                  //  await createDataProducer()
               } else {
                  //Create new transport for receiving media from server. At this point a mediasoup server has already created an identical transport with the same transport params
                  const newConsumerTransport: Transport =
                     device.createRecvTransport(transportParams)
                  consumerTransport.current = newConsumerTransport
                  monitorConsumerTransport()
               }
            } else {
               throw new Error(
                  "Unable to create transport for " + transportType,
               )
            }
         },
      )
   }

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

   //Establishes connection to socket-io server
   const establishSocketIoConnection = async () => {
      if (!socketRef.current) {
         const newSocket: Socket = io(SERVER_BASE_URL, {
            path: "/server/",
            withCredentials: false,
         })
         socketRef.current = newSocket
      }
      const socket = socketRef.current
      return new Promise((resolve, reject) => {
         socket.on("connect", () => {
            console.log("Client connected", socket.id)
            setSocketConnected(true)
            requestRouterRTPCapabilities(socket)
            resolve({})
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
               await initializeClientTransports(socket, device)
            } catch (e) {
               setErrors({ ...errors, RTPCapabilitiesPayload: true })
            }
         })
         socket.on("newProducer", (msg: any) => {
            const {
               peerId,
               producerTransportId,
            }: { peerId: string; producerTransportId: string } = msg
            //since room broadcasts new producers to everyone, ignore this request for self join, sanity check
            if (userMeta.id !== peerId) {
               console.log("Client received broadcast message for new producer")
               initConsumeMedia({ peerId, producerTransportId })
            }
         })
         socket.on("removeConsumer", (msg: any) => {
            const { id }: { id: string } = msg
            console.log(
               `Client ${userMeta.name} received remove consumer request ${id}`,
            )
            closeConsumer(id)
         })
         socket.on("newDataProducer", async (msg: any) => {
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
         })
      })
   }
   const closeConsumer = (id: string) => {
      const consumerToClose = consumers.current.filter((c) => c.id === id)[0]
      console.log(
         "all consumers",
         consumers.current.map((c) => c.id),
      )
      console.log("Closing consumer", consumerToClose)
      if (consumerToClose) {
         console.log({ consumerToClose })
         consumerToClose.close()
         consumers.current = consumers.current.filter((c) => c.id !== id)
      }
   }

   const closeProducerTransport = () => {
      producerTransport.current.close()
   }
   const closeConsumerTransport = () => {
      consumerTransport.current.close()
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
   const disconnectSocketIoConnection = () => {
      if (socketRef.current) {
         socketRef.current.emit("removePeer", { userMeta, roomId })
         socketRef.current.disconnect()
      }
      if (consumerTransport.current) consumerTransport.current.close()
      if (producerTransport.current) producerTransport.current.close()
   }
   useEffect(() => {
      establishSocketIoConnection()
      return () => disconnectSocketIoConnection()
   }, [])

   return (
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
                        await initProduceMedia({
                           video: true,
                        })
                     }
                  }}
               >
                  Produce Video
               </button>
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
            <div className="flex">
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
               <div>
                  Remote Video
                  <video
                     muted
                     loop
                     autoPlay
                     //  controls
                     playsInline
                     ref={remoteVideoRef}
                     style={{
                        width: "500px",
                        height: "500px",
                     }}
                  ></video>
               </div>
               <div>
                  <button
                     onClick={() => {
                        disconnectSocketIoConnection()
                     }}
                  >
                     Disconnect
                  </button>
               </div>
               <a href="/about">about</a>
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
            <div>Producers</div>
            <div>{JSON.stringify(producers.current.map((p) => p.id))}</div>
            <div>Consumers</div>
            <div>{JSON.stringify(consumers.current.map((p) => p.id))}</div>
         </div>
      </main>
   )
}
