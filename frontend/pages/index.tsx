import { useCallback, useContext, useEffect, useState } from "react"
import { AUDIO_CONSTRAINTS, VIDEO_CONSTRAINTS } from "../config"
import Button from "../lib/components/Button"
import Canvas from "../lib/components/Canvas"
import MediaManager from "../lib/components/MediaManager"
import StatusComponent from "../lib/components/StatusComponent"
import getRandomId from "../lib/helpers/getRandomId"
import useConnectToMediasoup from "../lib/hooks/useConnectToMediasoup"
import useConsumers from "../lib/hooks/useConsumers"
import useDataConsumers from "../lib/hooks/useDataConsumers"
import useDataProducers from "../lib/hooks/useDataProducers"
import useDebug from "../lib/hooks/useDebug"
import useHandleNewPeers from "../lib/hooks/useHandleNewPeers"
import useMonitorRoom from "../lib/hooks/useMonitorRoom"
import useProducers from "../lib/hooks/useProducers"
import useRoomCanvas from "../lib/hooks/useRoomCanvas"
import { SocketContext } from "../lib/socket"

export default function Home() {
   const socket = useContext(SocketContext)
   const [id] = useState(() => getRandomId().toString())
   const [toggleRoomCanvas, setToggleRoomCanvas] = useState(false)
   const { roomInfo, handleRoomUpdate } = useMonitorRoom() //use this hook one level higher
   const [userMeta, setUserMeta] = useState({
      id: id,
      name: id,
   })
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

   const { consumerContainers, initConsumeMedia, handleConsumerUpdate } =
      useConsumers({
         userMeta,
         roomId: roomInfo.id,
         socket,
         consumerTransport,
         mediaSoupDevice,
         initializeConsumerTransport,
      })
   const { producerContainers, createProducer, updateProducerOfType } =
      useProducers({
         userMeta,
         roomId: roomInfo.id,
         socket,
         producerTransport,
         initializeProducerTransport,
         closeProducerTransport,
      })

   const { dataProducerContainers, createDataProducer } = useDataProducers({
      userMeta,
      roomId: roomInfo.id,
      socket,
      producerTransport,
      initializeProducerTransport,
      closeProducerTransport,
   })
   const {
      sendCanvasData,
      openRoomCanvas,
      canvasRef,
      loadToCanvas,
      closeRoomCanvas,
   } = useRoomCanvas({ createDataProducer })

   const { dataConsumerContainers, initDataConsume, handleCloseDataConsumer } =
      useDataConsumers({
         userMeta,
         roomId: roomInfo.id,
         socket,
         consumerTransport,
         mediaSoupDevice,
         initializeConsumerTransport,
         loadToCanvas,
      })

   const { handleNewDataProducer, handleNewProducer } = useHandleNewPeers({
      initDataConsume,
      initConsumeMedia,
      producerTransport,
      consumerTransport,
   })

   //Start producing as soon as we establish a transport for producing
   useEffect(() => {
      if (producerTransport) {
         if (checkDeviceProduceCapability("video")) {
            createProducer({
               mediaConstraints: VIDEO_CONSTRAINTS,
               transportDataType: "video",
            })
         }
         // openRoomCanvas()
      }
   }, [producerTransport])

   const handleOpenRoomCanvas = async () => {
      //pause all producers for video, we still want to produce audio
      await updateProducerOfType("video", "pause")
      //initiate data producer for canvas data by calling openRoomCanvas
      await openRoomCanvas()
   }

   const handleCloseRoomCanvas = async () => {
      //resume all producers for video
      await updateProducerOfType("video", "resume")
      //close data producer for canvas data
      await closeRoomCanvas()
   }

   const checkDeviceProduceCapability = (kind: "audio" | "video"): boolean => {
      if (!mediaSoupDevice || !mediaSoupDevice.canProduce(kind)) {
         console.log("Cannot produce using this device, invalid device")
         setErrors({ ...errors, MediaError: true })
         return false
      }
      return true
   }

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
         socket.on("updateConsumer", handleConsumerUpdate)
         socket.on("roomUpdate", handleRoomUpdate)
      }
      return () => {
         if (socket) {
            // unbind all event handlers used in this component
            socket.off("error", socketError)
            socket.off("newDataProducer", handleNewDataProducer)
            socket.off("newProducer", handleNewProducer)
            socket.off("updateConsumer", handleConsumerUpdate)
            socket.off("roomUpdate", handleRoomUpdate)
         }
      }
   }, [
      socket,
      socketError,
      handleNewDataProducer,
      handleNewProducer,
      handleConsumerUpdate,
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
      dataConsumerContainers,
      dataProducerContainers,
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
                           await createProducer({
                              mediaConstraints: VIDEO_CONSTRAINTS,
                              transportDataType: "video",
                           })
                        }
                     }}
                  />
                  <Button
                     label="Audio On"
                     onClick={async () => {
                        if (checkDeviceProduceCapability("audio")) {
                           await createProducer({
                              mediaConstraints: AUDIO_CONSTRAINTS,
                              transportDataType: "audio",
                           })
                        }
                     }}
                  />
                  <Button label="Open Canvas" onClick={handleOpenRoomCanvas} />
                  <Button
                     label="Close Canvas"
                     onClick={handleCloseRoomCanvas}
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
                           label="Disconnect Producers"
                           onClick={() => {
                              consumerContainers.forEach((p) =>
                                 p.consumer.close(),
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
                           <MediaManager
                              id={p.peerId}
                              label={userMeta.name}
                              mediaStream={p.mediaStream}
                              peer={p.producer}
                              mediaType={p.producer.appData.dataType}
                           />
                        </div>
                     ))}
                  </div>

                  <div className="container mx-auto space-y-2 lg:space-y-0 lg:gap-2 lg:grid lg:grid-cols-3">
                     {consumerContainers.map((c, i) => (
                        <div key={c.consumer.id}>
                           <MediaManager
                              id={c.peerId}
                              label={c.name}
                              mediaStream={c.mediaStream}
                              peer={c.consumer}
                              mediaType={c.consumer.appData.dataType}
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
