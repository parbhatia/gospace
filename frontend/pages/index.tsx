import {
   DataConsumer,
   DataConsumerOptions,
} from "mediasoup-client/lib/DataConsumer"
import { DataProducer } from "mediasoup-client/lib/DataProducer"
import { Transport } from "mediasoup-client/lib/Transport"
import { useCallback, useContext, useEffect, useRef, useState } from "react"
import { AUDIO_CONSTRAINTS, VIDEO_CONSTRAINTS } from "../config"
import Button from "../lib/components/Button"
import Canvas from "../lib/components/Canvas"
import MediaComponent from "../lib/components/MediaComponent"
import StatusComponent from "../lib/components/StatusComponent"
import getRandomId from "../lib/helpers/getRandomId"
import useConnectToMediasoup from "../lib/hooks/useConnectToMediasoup"
import useConsumers from "../lib/hooks/useConsumers"
import useDebug from "../lib/hooks/useDebug"
import useProducers from "../lib/hooks/useProducers"
import { SocketContext } from "../lib/socket"
import { compress, decompress } from "lz-string"
import useMonitorRoom from "../lib/hooks/useMonitorRoom"

export default function Home() {
   const socket = useContext(SocketContext)
   const [id] = useState(() => getRandomId().toString())
   const { roomInfo, handleRoomUpdate } = useMonitorRoom() //use this hook one level higher
   const [userMeta, setUserMeta] = useState({
      id: id,
      name: id,
   })
   const [loadingCanvasData, setLoadingCanvasData] = useState(false)
   const [debugMode, setDebugMode] = useState(false)
   const [errors, setErrors] = useState({})
   const {
      mediaSoupDevice,
      producerTransport,
      consumerTransport,
      initializeProducerTransport,
      initializeConsumerTransport,
      closeProducerTransport,
      closeConsumerTransport,
      connectionStatus,
      connectToRoom,
      errors: mediaSoupErrors,
   } = useConnectToMediasoup({ userMeta, roomId: roomInfo.id, socket })
   const canvasRef = useRef(null)
   const { consumerContainers, initConsumeMedia, handleCloseConsumer } =
      useConsumers({
         userMeta,
         roomId: roomInfo.id,
         socket,
         consumerTransport,
         mediaSoupDevice,
         initializeConsumerTransport,
      })
   const { producerContainers, createProducer, handleNewProducer } =
      useProducers({
         userMeta,
         roomId: roomInfo.id,
         socket,
         producerTransport,
         initializeProducerTransport,
         closeProducerTransport,
         initConsumeMedia,
      })

   const dataProducers = useRef<Array<DataProducer>>([])
   const dataConsumers = useRef<Array<DataConsumer>>([])
   const canvasDataProducer = useRef<DataProducer>()

   //Start producing as soon as we establish a transport for producing
   useEffect(() => {
      if (producerTransport) {
         if (checkDeviceProduceCapability("video")) {
            createProducer(VIDEO_CONSTRAINTS)
         }
      }
   }, [producerTransport])

   const createDataProducer = async () =>
      new Promise(async (resolve, reject) => {
         let transport: Transport
         if (!producerTransport) {
            const newProducerTransport = await initializeProducerTransport()
            if (newProducerTransport) {
               transport = newProducerTransport
            } else reject("Produce transport not initialized")
         } else {
            transport = producerTransport
         }
         const newDataProducer = await transport!.produceData()

         canvasDataProducer.current = newDataProducer

         dataProducers.current.push(newDataProducer)
         resolve(newDataProducer)
      })

   const createDataConsumer = async ({
      dataProducerId,
   }: {
      dataProducerId: string
   }) =>
      new Promise(async (resolve, reject) => {
         let transport: Transport
         if (!consumerTransport) {
            const newConsumerTransport = await initializeConsumerTransport()
            if (newConsumerTransport) {
               transport = newConsumerTransport
            } else reject("Consumer transport not initialized")
         } else if (!mediaSoupDevice) {
            reject("Mediasoup device does not exist")
         } else {
            transport = consumerTransport
         }
         socket.emit(
            "addDataConsumer",
            {
               userMeta,
               roomId: roomInfo.id,
               transportId: transport!.id,
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
               const dataConsumer = await transport.consumeData({
                  id,
                  dataProducerId,
                  sctpStreamParameters,
                  label,
                  protocol,
               })
               dataConsumer.on("message", async (data) => {
                  //data is likely stringified json, might need to parse
                  await loadToCanvas(data)
                  // console.log("RECEIVED DATA MESSAGE", data)
               })
               dataConsumers.current.push(dataConsumer)
            },
         )
      })

   const loadToCanvas = async (rawData) => {
      if (!canvasRef || !canvasRef.current) return null
      const decompressedParsedCanvasData = decompress(JSON.parse(rawData))
      setLoadingCanvasData(true)
      canvasRef.current!.loadSaveData(decompressedParsedCanvasData, true) //2nd param is immediate loading
      setLoadingCanvasData(false)
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

   const checkDeviceProduceCapability = (kind: "audio" | "video"): boolean => {
      if (!mediaSoupDevice || !mediaSoupDevice.canProduce(kind)) {
         console.log("Cannot produce using this device, invalid device")
         setErrors({ ...errors, MediaError: true })
         return false
      }
      return true
   }

   //Sends raw data, or JSON stringified data via data producer
   const sendData = async ({
      dataProducer,
      data,
      sendRaw = false,
   }: {
      dataProducer: DataProducer | undefined
      data: any
      sendRaw: boolean
   }) => {
      if (dataProducer && !dataProducer.closed) {
         if (sendRaw) {
            await dataProducer.send(data)
         } else {
            await dataProducer.send(JSON.stringify(data))
         }
      }
   }

   const sendCanvasData = async () => {
      if (loadingCanvasData || !canvasRef || !canvasRef.current) return null
      const savedData = await canvasRef.current.getSaveData()
      const compressedStringData = compress(savedData)
      await sendData({
         dataProducer: canvasDataProducer.current,
         data: compressedStringData,
         sendRaw: false,
      })
   }

   const openRoomCanvas = async () => {
      await createDataProducer()
   }

   //We handle not consuming our own producer in backend
   const handleNewDataProducer = useCallback(
      async (msg: any) => {
         const {
            peerId,
            dataProducerId,
         }: { peerId: string; dataProducerId: string } = msg
         // console.log(
         //    "Client received broadcast message for new data producer",
         // )
         await initDataConsume({ peerId, dataProducerId })
      },
      [initDataConsume],
   )

   const socketConnect = useCallback(() => {
      console.log("Client connected", socket.id)
      connectToRoom()
   }, [connectToRoom])

   const socketError = useCallback(() => {
      setErrors({ ...errors, SocketConnectionError: true })
   }, [setErrors])

   //Once socket is connected, listen to socket events
   useEffect(() => {
      if (socket) {
         socket.on("error", socketError)
         socket.on("newDataProducer", handleNewDataProducer)
         socket.on("newProducer", handleNewProducer)
         socket.on("closeConsumer", handleCloseConsumer)
         socket.on("roomUpdate", handleRoomUpdate)
      }
      return () => {
         if (socket) {
            // unbind all event handlers used in this component
            socket.off("error", socketError)
            socket.off("newDataProducer", handleNewDataProducer)
            socket.off("newProducer", handleNewProducer)
            socket.off("closeConsumer", handleCloseConsumer)
            socket.off("roomUpdate", handleRoomUpdate)
         }
      }
   }, [
      socket,
      socketError,
      handleNewDataProducer,
      handleNewProducer,
      handleCloseConsumer,
   ])

   const closeSocket = () => {
      console.log("Closing socket")
      closeConsumerTransport()
      closeProducerTransport()
      // disconnect socket and signal to remove peer from backend
      socket.emit("removePeer", { userMeta, roomId: roomInfo.id })
      socket.disconnect()
   }

   useEffect(() => {
      socket.on("connect", socketConnect)
      return () => closeSocket()
   }, [])

   const debug = () => {
      console.log("")
      console.log("ProducerTransport:")
      console.log(producerTransport?.id)
      console.log("")
      console.log("")
      console.log("ConsumerTransport:")
      console.log(consumerTransport?.id)
      console.log("")
      console.log("ProducerContainers:")
      producerContainers.forEach(async (p, i) => {
         console.log(p.name, p.mediaStream)
      })
      console.log("ConsumersContainers:")
      consumerContainers.forEach(async (p, i) => {
         console.log(p.name, p.mediaStream)
      })
      console.log("")
   }
   const JSON_DEBUG_STATEMENT = useDebug({
      socket,
      consumerTransport,
      producerTransport,
      producerContainers,
      consumerContainers,
      dataConsumers,
      dataProducers,
   })
   return (
      <SocketContext.Provider value={socket}>
         <main className="p-2 m-2">
            <div className="flex flex-col w-full mb-20 text-center">
               <h1 className="p-1 text-2xl font-medium text-gray-900 title-font">
                  {roomInfo.name}
               </h1>
               <p className="p-1 mx-auto mb-2 text-base leading-relaxed lg:w-2/3">
                  {roomInfo.totalPeers} peers
               </p>
               <StatusComponent connectionStatus={connectionStatus} />
            </div>
            <div>
               <div className="flex flex-wrap justify-center">
                  <Button
                     label="Camera On"
                     onClick={async () => {
                        if (checkDeviceProduceCapability("video")) {
                           await createProducer(VIDEO_CONSTRAINTS)
                        }
                     }}
                  />
                  <Button
                     label="Audio On"
                     onClick={async () => {
                        if (checkDeviceProduceCapability("audio")) {
                           await createProducer(AUDIO_CONSTRAINTS)
                        }
                     }}
                  />
                  <Button
                     label="Open Canvas"
                     onClick={async () => {
                        await openRoomCanvas()
                     }}
                  />
                  <Button
                     label="Send Data"
                     onClick={async () => {
                        await sendData({
                           dataProducer: canvasDataProducer.current,
                           data: {
                              hello: "world",
                           },
                           sendRaw: false,
                        })
                     }}
                  />

                  <Button
                     label="Stats"
                     onClick={() => {
                        debug()
                        socket.emit("debug", { roomId: roomInfo.id, userMeta })
                     }}
                  />

                  <Button
                     label="Reconnect"
                     onClick={async () => {
                        socketConnect()
                     }}
                  />
                  <Button
                     label="Debug"
                     onClick={async () => {
                        setDebugMode((prev) => !prev)
                     }}
                  />
               </div>
               {debugMode && (
                  <>
                     <div className="flex flex-wrap">
                        <Button
                           label="Disconnect Producers"
                           onClick={() => {
                              producerContainers.forEach((p) =>
                                 p.producer.close(),
                              )
                           }}
                        />
                        <Button
                           label="Disconnect Producer Transport"
                           onClick={() => {
                              closeProducerTransport()
                           }}
                        />
                        <Button
                           label="Disconnect Consumer Transport"
                           onClick={() => {
                              closeConsumerTransport()
                           }}
                        />
                        <Button
                           label="Get existing"
                           onClick={() => {
                              if (consumerTransport)
                                 socket.emit("consumeExistingProducers", {
                                    roomId: roomInfo.id,
                                    userMeta,
                                 })
                           }}
                        />
                        <Button
                           label="Disconnect Socket"
                           onClick={() => {
                              closeSocket()
                           }}
                        />
                     </div>
                     <pre>{JSON_DEBUG_STATEMENT}</pre>
                  </>
               )}
            </div>
            <section className="text-gray-600 body-font">
               <div className="container px-5 py-24 mx-auto">
                  <div>
                     {producerContainers.map((p) => (
                        <div key={p.producer.id}>
                           <MediaComponent
                              label={userMeta.name}
                              mediaStream={p.mediaStream}
                              peer={p.producer}
                           />
                        </div>
                     ))}
                  </div>

                  <div></div>
                  <div className="container mx-auto space-y-2 lg:space-y-0 lg:gap-2 lg:grid lg:grid-cols-3">
                     {consumerContainers.map((c, i) => (
                        <div key={c.consumer.id}>
                           <MediaComponent
                              label={c.name}
                              mediaStream={c.mediaStream}
                              peer={c.consumer}
                           />
                        </div>
                     ))}
                  </div>
               </div>
            </section>
            <Canvas canvasRef={canvasRef} onChange={sendCanvasData} />
         </main>
      </SocketContext.Provider>
   )
}
