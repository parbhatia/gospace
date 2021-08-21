import { Consumer } from "mediasoup-client/lib/Consumer"
import {
   DataConsumer,
   DataConsumerOptions,
} from "mediasoup-client/lib/DataConsumer"
import { DataProducer } from "mediasoup-client/lib/DataProducer"
import { Producer } from "mediasoup-client/lib/Producer"
import { Transport } from "mediasoup-client/lib/Transport"
import { useCallback, useContext, useEffect, useRef, useState } from "react"
import MediaComponent from "../lib/components/MediaComponent"
import createMediaStream from "../lib/helpers/createMediaStream"
import createMediaStreamFromTrack from "../lib/helpers/createMediaStreamFromTrack"
import useConnectToMediasoup from "../lib/hooks/useConnectToMediasoup"
import { SocketContext } from "../lib/socket"
import { ConsumeServerConsumeParams } from "../lib/types"
import getRandomId from "../lib/helpers/getRandomId"
import useConsumers from "../lib/hooks/useConsumers"
import useProducers from "../lib/hooks/useProducers"

export default function Home() {
   const socket = useContext(SocketContext)
   const [id] = useState(() => getRandomId().toString())
   const [userMeta, setUserMeta] = useState({
      id: id,
      name: id,
   })
   const [roomId, setRoomId] = useState("my-room")
   const [errors, setErrors] = useState({})
   const {
      mediaSoupDevice,
      producerTransport,
      consumerTransport,
      initializeProducerTransport,
      initializeConsumerTransport,
      closeProducerTransport,
      closeConsumerTransport,
      connected,
      connectToRoom,
      errors: mediaSoupErrors,
   } = useConnectToMediasoup({ userMeta, roomId, socket })
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
               dataConsumer.on("message", (data) => {
                  //data is likely stringified json, might need to parse
                  console.log("RECEIVED DATA MESSAGE", data)
               })
               dataConsumers.current.push(dataConsumer)
            },
         )
      })

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
   }, [])

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
   return (
      <SocketContext.Provider value={socket}>
         <main>
            <div>
               <div>{userMeta.name}</div>
               {connected ? (
                  <div className="lg bg-green-500">CONNECTED</div>
               ) : (
                  <div className="lg bg-red-500">DISCONNECTED</div>
               )}
               {producerTransport && !producerTransport.closed ? (
                  <div className="lg bg-green-500">
                     PRODUCER TRANSPORT CONNECTED
                  </div>
               ) : (
                  <div className="lg bg-red-500">
                     PRODUCER TRANSPORT DISCONNECTED
                  </div>
               )}
               {consumerTransport && !consumerTransport.closed ? (
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
               <div className="flex">
                  <div>Producers</div>
                  <div>
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
                  </div>
                  <div>Consumers</div>
                  <div className="flex">
                     {consumerContainers.map((c, i) => (
                        <div key={c.consumer.id} className="border-2">
                           <MediaComponent
                              label={c.name}
                              mediaStream={c.mediaStream}
                              peer={c.consumer}
                           />
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
                        producerContainers.forEach((p) => p.producer.close())
                     }}
                  >
                     Disconnect Producers
                  </button>
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
                        debug()
                        socket.emit("debug", { roomId, userMeta })
                     }}
                  >
                     Debug
                  </button>
               </div>
               <div>
                  <button
                     onClick={() => {
                        if (consumerTransport)
                           socket.emit("consumeExistingProducers", {
                              roomId,
                              userMeta,
                           })
                     }}
                  >
                     Get existing
                  </button>
               </div>
               <div>
                  <button
                     onClick={async () => {
                        socketConnect()
                     }}
                  >
                     Reconnect
                  </button>
               </div>

               {/* <div>{JSON.stringify(consumerContainers.map((c) => c.id))}</div> */}
            </div>
         </main>
      </SocketContext.Provider>
   )
}
