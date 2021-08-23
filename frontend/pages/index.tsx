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

export default function Home() {
   const socket = useContext(SocketContext)
   const [id] = useState(() => getRandomId().toString())
   const [userMeta, setUserMeta] = useState({
      id: id,
      name: id,
   })
   const [roomId, setRoomId] = useState("my-room")
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
   } = useConnectToMediasoup({ userMeta, roomId, socket })
   const canvasRef = useRef(null)
   const { consumerContainers, initConsumeMedia, handleCloseConsumer } =
      useConsumers({
         userMeta,
         roomId,
         socket,
         consumerTransport,
         mediaSoupDevice,
         initializeConsumerTransport,
      })
   const { producerContainers, createProducer, handleNewProducer } =
      useProducers({
         userMeta,
         roomId,
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
               roomId,
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
                  // console.log("RECEIVED DATA MESSAGE", data)
                  const newData = JSON.parse(data)
                  // canvasRef.current!.loadSaveData(newData, false) //2nd param is immediate
                  // await canvasRef.current.loadPaths(JSON.parse(data))
                  // await loadToCanvas(newData)
                  setLoadingCanvasData(true)
                  canvasRef.current!.loadSaveData(newData, true) //2nd param is immediate
                  setLoadingCanvasData(false)
               })
               dataConsumers.current.push(dataConsumer)
            },
         )
      })

   // const loadToCanvas = (loadedData): Promise<void> =>
   //    new Promise((resolve, reject) => {
   //       setLoadingCanvasData(true)
   //       canvasRef.current!.loadSaveData(loadedData, false) //2nd param is immediate
   //       setLoadingCanvasData(false)
   //       resolve()
   //    })

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
            await dataProducer.send(JSON.stringify(data))
         } else {
            await dataProducer.send(data)
         }
      }
   }

   const sendCanvasPaths = async () => {
      if (loadingCanvasData) return null
      const savedData = await canvasRef.current.getSaveData()
      await sendData({
         dataProducer: canvasDataProducer.current,
         data: savedData,
         sendRaw: true,
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
      }
      return () => {
         if (socket) {
            // unbind all event handlers used in this component
            socket.off("error", socketError)
            socket.off("newDataProducer", handleNewDataProducer)
            socket.off("newProducer", handleNewProducer)
            socket.off("closeConsumer", handleCloseConsumer)
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
      socket.emit("removePeer", { userMeta, roomId })
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
            <StatusComponent connectionStatus={connectionStatus} />
            <div>
               <div>{userMeta.name}</div>
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
                        socket.emit("debug", { roomId, userMeta })
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
                                    roomId,
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
               {/* <div>
                  Learn <a href="/RoomList">Room List!</a>
               </div> */}
            </div>
            <section className="text-gray-600 body-font">
               <div className="container px-5 py-24 mx-auto">
                  <div>
                     {producerContainers.map((p) => (
                        <div key={p.producer.id}>
                           <MediaComponent
                              label={null}
                              mediaStream={p.mediaStream}
                              peer={p.producer}
                           />
                        </div>
                     ))}
                  </div>
                  <div className="flex flex-col w-full mb-20 text-center">
                     <h1 className="mb-4 text-2xl font-medium text-gray-900 title-font">
                        Peers
                     </h1>
                     <p className="mx-auto text-base leading-relaxed lg:w-2/3">
                        Welcome to the room!
                     </p>
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
            <Canvas canvasRef={canvasRef} onChange={sendCanvasPaths} />
         </main>
      </SocketContext.Provider>
   )
}

// const DummyVideoComponent = () => (
//    <div className="p-4 lg:w-1/4 md:w-1/2">
//       <div className="flex flex-col items-center h-full text-center">
//          <img
//             alt="team"
//             className="flex-shrink-0 object-cover object-center w-full h-56 mb-4 rounded-lg"
//             src="https://dummyimage.com/202x202"
//          />
//          <div className="w-full">
//             <h2 className="text-lg font-medium text-gray-900 title-font">
//                Atticus Finch
//             </h2>
//             <h3 className="mb-3 text-gray-500">UI Developer</h3>
//          </div>
//       </div>
//    </div>
// )
