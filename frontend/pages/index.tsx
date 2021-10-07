import { useCallback, useContext, useEffect, useState } from "react"
import ReconnectIcon from "../assets/redo.svg"
import Button from "../lib/components/Button"
import Canvas from "../lib/components/Canvas"
import CanvasManager from "../lib/components/CanvasManager"
import ConsumerDistributor from "../lib/components/ConsumerDistributor"
import ProducerControls from "../lib/components/ProducerControls"
import ProducerDistributor from "../lib/components/ProducerDistributor"
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
   const { roomInfo, handleRoomUpdate, timeElapsed } = useMonitorRoom() //use this hook one level higher
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
   const {
      producerContainer,
      updateProducerOfType,
      createVideoProducer,
      createAudioProducer,
   } = useProducers({
      userMeta,
      roomId: roomInfo.id,
      socket,
      mediaSoupDevice,
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
         createVideoProducer()
         createAudioProducer()
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

   const JSON_DEBUG_STATEMENT = useDebug({
      socket,
      consumerTransport,
      producerTransport,
      producerContainer,
      consumerContainers,
      dataConsumerContainers,
      dataProducerContainers,
   })

   return (
      <div data-theme="cupcake" className="w-screen h-screen p-2 body-font bg-base-100 text-neutral ">
         <SocketContext.Provider value={socket}>
            <main className="flex flex-col w-full h-full">
               <div className="flex flex-col">
                  <div className="flex flex-wrap w-full text-center">
                     <div className="flex flex-grow">
                        <h1 className="p-1 font-mono text-2xl font-medium title-font">
                           {roomInfo.name}
                        </h1>
                     </div>
                     <div className="flex items-center font-mono">

                        <p className="p-1 text-lg leading-relaxed lg:w-2/3">
                           {roomInfo.totalPeers} {roomInfo.totalPeers === 1 ? "peer" : "peers"}
                        </p>
                        {timeElapsed && timeElapsed.substring(0, 2) !== "00" &&
                           <p className="p-1 font-mono text-lg countdown">
                              <span style={{ '--value': timeElapsed?.substring(0, 2) } as any}></span>h
                           </p>
                        }
                        <p className="p-1 font-mono text-lg countdown">
                           <span style={{ '--value': timeElapsed?.substring(3, 5) } as any}></span>m
                        </p>
                        <p className="p-1 font-mono text-lg countdown">
                           <span style={{ '--value': timeElapsed?.substring(6, 8) } as any}></span>s
                        </p>
                        <StatusComponent connectionStatus={connectionStatus} />
                     </div>
                  </div>


                  <div className="flex flex-wrap justify-center">
                     <CanvasManager
                        handleOpenRoomCanvas={handleOpenRoomCanvas}
                        handleCloseRoomCanvas={handleCloseRoomCanvas}
                     >
                        <Canvas canvasRef={canvasRef} onChange={sendCanvasData} />
                     </CanvasManager>
                     <Button
                        onClick={async () => {
                           socketConnect()
                        }}
                     >
                        <ReconnectIcon />
                        <span className="ml-1"> Reconnect</span>
                     </Button>

                  </div>
               </div>


               <ConsumerDistributor
                  transportType="consumer"
                  containers={consumerContainers}
               />
               {/* <ConsumerDistributor
                  transportType="consumer"
                  containers={Array.from(Array(4).keys()).map(i => producerContainer)}
               /> */}


               {/* {Array.from(Array(5).keys()).map(i => <ConsumerDistributor
                     transportType="consumer"
                     containers={consumerContainers}
                     updateProducerOfType={null}
                     createVideoProducer={null}
                     createAudioProducer={null}
                  />
                  )} */}

               <div className="absolute bottom-0 left-0 right-0 flex flex-col w-full p-4">
                  <ProducerDistributor producerContainer={producerContainer} />


                  <div className="flex">
                     <div className="flex flex-grow">

                        <ProducerControls
                           updateProducerOfType={updateProducerOfType}
                           createVideoProducer={createVideoProducer}
                           createAudioProducer={createAudioProducer}
                           audioProducerCreated={
                              producerContainer.audio !== null &&
                              producerContainer.audio !== undefined
                           }
                           videoProducerCreated={
                              producerContainer.video !== null &&
                              producerContainer.video !== undefined
                           }
                        />
                     </div>
                     <div>

                        <Button
                           onClick={async () => {
                              setDebugMode((prev) => !prev)
                           }}
                        >
                           Debug
                        </Button>
                        <Button
                           onClick={() => {
                              socket.emit("debug", { roomId: roomInfo.id, userMeta })
                           }}
                        >
                           Debug Backend
                        </Button>
                     </div>
                  </div>
                  {debugMode && (
                     <>
                        <div className="flex flex-wrap">
                           <Button
                              onClick={() => {
                                 producerContainer.audio?.producer.close()
                                 producerContainer.video?.producer.close()
                              }}
                           >
                              Disconnect Producers
                           </Button>
                           <Button
                              onClick={() => {
                                 consumerContainers.forEach((p) => {
                                    p.audio?.consumer.close()
                                    p.video?.consumer.close()
                                 })
                              }}
                           >
                              Disconnect Producers
                           </Button>
                           <Button
                              onClick={() => {
                                 closeProducerTransport()
                              }}
                           >
                              Disconnect Producer Transport
                           </Button>
                           <Button
                              onClick={() => {
                                 closeConsumerTransport()
                              }}
                           >
                              Disconnect Consumer Transport
                           </Button>
                           <Button
                              onClick={() => {
                                 closeSocket()
                              }}
                           >
                              Disconnect Socket
                           </Button>
                        </div>
                        <pre className="text-xs bg-white">{JSON_DEBUG_STATEMENT}</pre>
                     </>
                  )}
               </div>
            </main>
         </SocketContext.Provider>
      </div>
   )
}
