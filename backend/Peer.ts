import type { MediaKind, RtpParameters } from "mediasoup/lib/RtpParameters"
import type {
   Router,
   Transport,
   DtlsParameters,
   IceCandidate,
   IceParameters,
   WebRtcTransport,
   RtpCapabilities,
   Consumer,
   Producer,
   DataProducer,
   DataConsumer,
   SctpStreamParameters,
} from "mediasoup/lib/types"
import type { Socket } from "socket.io"
import { socketServer } from "./main"
import type { PeerEntityType, PeerEntityUpdateType } from "./types"

import mediasoupConfig from "./config/mediasoup"
import type Room from "./Room"
import type {
   WebRtcTransportParams,
   UserMeta,
   ConsumeServerConsumeParams,
   ConsumeDataConsumerParams,
} from "./types"
import debugm from "debug"
const debug = debugm("app:Peer")
interface WebRtcTransportConstuctParams {
   userMeta: UserMeta
   router: Router
   socket: Socket
   roomId: string
   room: Room
}

// A Peer associates a set of {transports, producers, consumers, websocket connection, metadata} of a client, inside a Room
class Peer {
   private userMeta: UserMeta
   private router: Router
   private roomId: string
   private room: Room
   private socket: Socket
   private transports: Map<string, Transport>
   private producers: Map<string, Producer>
   private consumers: Map<string, Consumer>
   private dataProducers: Map<string, DataProducer>
   private dataConsumers: Map<string, DataConsumer>

   constructor({
      userMeta,
      router,
      socket,
      roomId,
      room,
   }: WebRtcTransportConstuctParams) {
      this.userMeta = userMeta
      this.router = router
      this.socket = socket
      this.roomId = roomId
      this.room = room
      this.transports = new Map()
      this.producers = new Map()
      this.consumers = new Map()
      this.dataProducers = new Map()
      this.dataConsumers = new Map()
   }
   // This is negotiated/created using a Router, it represents a network path to receive/send media.
   // *Note: Each Transport in mediasoup-client must be associated to a single WebRtcTransport in mediasoup server
   createWebRtcTransport = async (): Promise<WebRtcTransportParams> => {
      const { listenIps, maxIncomingBitrate, initialAvailableOutgoingBitrate } =
         mediasoupConfig.mediasoup.webRtcTransport
      const transport: WebRtcTransport =
         await this.router.createWebRtcTransport({
            listenIps,
            initialAvailableOutgoingBitrate,
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            enableSctp: true,
         })
      await transport.setMaxIncomingBitrate(maxIncomingBitrate)
      const transportParams: WebRtcTransportParams = {
         id: transport.id,
         iceParameters: transport.iceParameters,
         iceCandidates: transport.iceCandidates,
         dtlsParameters: transport.dtlsParameters,
         sctpParameters: transport.sctpParameters,
      }
      transport.on("dtlsstatechange", (dtlsState) => {
         // RTCPeerConnection is probably closed
         if (dtlsState === "closed") {
            transport.close()
            this.removeTransport({ id: transport.id })
         }
      })
      transport.on("routerclose", () => {
         transport.close()
         this.removeTransport({ id: transport.id })
      })
      transport.on("close", () => {
         debug(
            `Peer ${this.userMeta.name}'s transport with ${transport.id} has closed`,
         )
         this.removeTransport({ id: transport.id })
      })
      transport.observer.on("close", () => {
         debug(
            `Peer ${this.userMeta.name}'s transport with ${transport.id} has closed IN OBSERVER`,
         )
      })
      // setTimeout(() => transport.close(), 10000)
      this.transports.set(transport.id, transport)
      return transportParams
   }
   getUserMeta = () => this.userMeta
   getSocket = () => this.socket
   getTransport = ({ id }: { id: string }): Transport | null => {
      if (this.transportExists({ id })) {
         return this.transports.get(id)!
      }
      return null
   }
   private transportExists = ({ id }: { id: string }): boolean =>
      this.transports.has(id)
   connectTransport = async ({
      id,
      dtlsParameters,
   }: {
      id: string
      dtlsParameters: DtlsParameters
   }) => {
      if (this.transportExists({ id })) {
         const transport: Transport = this.getTransport({ id })!
         // debug(
         //    `Peer ${this.userMeta.name} has connected transport with id ${id}`,
         // )
         await transport.connect({ dtlsParameters })
      }
   }
   removeTransport = ({ id }: { id: string }) => {
      this.transports.delete(id)
   }
   removeConsumerOfProducer = ({ producerId }: { producerId: string }) => {
      const consumer: Consumer | null = this.getConsumerOfProducer({
         producerId,
      })
      if (consumer) {
         debug(
            `Peer ${this.userMeta.name}'s consumer of producer is being removed`,
         )
         this.updateConsumerHelper({
            id: consumer.id,
            peerEntityUpdateType: "close",
            notifyClient: true,
         })
      }
   }
   //used by backend
   updateConsumerHelper = async ({
      id,
      notifyClient = false,
      peerEntityUpdateType,
   }: {
      id: string
      notifyClient: boolean
      peerEntityUpdateType: PeerEntityUpdateType
   }) => {
      debug(
         `Peer ${this.userMeta.name} needs to ${peerEntityUpdateType} consumer of id ${id}`,
      )
      const consumerToPause = this.getConsumer({ id })
      if (consumerToPause) {
         switch (peerEntityUpdateType) {
            case "close":
               this.consumers.delete(id)
               notifyClient
                  ? this.socket.emit("updateConsumer", {
                     id,
                     userMeta: this.userMeta,
                     updateType: "close",
                  })
                  : null
               break
            case "pause":
               await consumerToPause.pause()
               notifyClient
                  ? this.socket.emit("updateConsumer", {
                     id,
                     userMeta: this.userMeta,
                     updateType: "pause",
                  })
                  : null
               break
            case "resume":
               await consumerToPause.resume()
               notifyClient
                  ? this.socket.emit("updateConsumer", {
                     id,
                     userMeta: this.userMeta,
                     updateType: "resume",
                  })
                  : null
               break
            default:
               debug("invalid peer entity update type")
         }
      }
   }

   removeProducer = ({ id }: { id: string }) => {
      this.producers.delete(id)
   }
   removeDataProducer = ({ id }: { id: string }) => {
      this.dataProducers.delete(id)
   }
   removeDataConsumer = ({ id }: { id: string }) => {
      debug(
         `Peer ${this.userMeta.name} needs to remove data consumer of id ${id}`,
      )
      this.dataConsumers.delete(id)
   }

   //Non repetetive updater, called by client in frontend, so we make sure to not notify the client back about any updates
   handleEntityUpdate = async ({
      peerEntityType,
      peerEntityUpdateType,
      id,
   }: {
      id: string
      peerEntityType: PeerEntityType
      peerEntityUpdateType: PeerEntityUpdateType
   }) => {
      switch (peerEntityType) {
         case "ProducerTransport":
            switch (peerEntityUpdateType) {
               case "close":
                  this.getTransport({ id })?.close()
                  this.removeTransport({ id })
                  break
               default:
                  debug("Invalid peer entity update type")
            }
            break
         case "ConsumerTransport":
            switch (peerEntityUpdateType) {
               case "close":
                  this.getTransport({ id })?.close()
                  this.removeTransport({ id })
                  break
               default:
                  debug("Invalid peer entity update type")
            }
            break
         case "Producer":
            switch (peerEntityUpdateType) {
               case "close":
                  this.getProducer({ id })?.close()
                  this.removeProducer({ id })
                  break
               case "pause":
                  await this.getProducer({ id })?.pause()
                  return this.getProducer({ id })?.paused
               // break
               case "resume":
                  await this.getProducer({ id })?.resume()
                  return !this.getProducer({ id })?.paused
               // break
               default:
                  debug("Invalid peer entity update type")
            }
            break
         case "Consumer":
            switch (peerEntityUpdateType) {
               case "close":
                  await this.updateConsumerHelper({
                     id,
                     peerEntityUpdateType: "close",
                     notifyClient: false,
                  })
                  break
               default:
                  debug("Invalid peer entity update type")
            }
            break
         case "DataProducer":
            switch (peerEntityUpdateType) {
               case "close":
                  this.getDataProducer({ id })?.close()
                  this.removeDataProducer({ id })
                  break
               default:
                  debug("Invalid peer entity update type")
            }
            break
         case "DataConsumer":
            switch (peerEntityUpdateType) {
               case "close":
                  this.getDataConsumer({ id })?.close()
                  this.removeDataConsumer({ id })
                  break
               default:
                  debug("Invalid peer entity update type")
            }
            break
         default:
            return
      }
   }

   getDataProducer = ({ id }: { id: string }) => this.dataProducers.get(id)
   getDataConsumer = ({ id }: { id: string }) => this.dataConsumers.get(id)
   getProducer = ({ id }: { id: string }) => this.producers.get(id)
   getConsumer = ({ id }: { id: string }) => this.consumers.get(id)
   getConsumerOfProducer = ({
      producerId,
   }: {
      producerId: string
   }): Consumer | null => {
      let consumerIdFound = ""
      this.consumers.forEach((consumer, consumerId) => {
         if (consumer.producerId === producerId) {
            consumerIdFound = consumerId
            debug(
               `Peer ${this.userMeta.name}'s consumer of producer is found ${consumerId}`,
            )
         }
      })
      if (consumerIdFound !== "") {
         return this.consumers.get(consumerIdFound)!
      } else {
         return null
      }
   }
   addProducer = async ({
      id,
      rtpParameters,
      kind,
      appData,
   }: {
      id: string
      rtpParameters: RtpParameters
      kind: MediaKind
      appData: any
   }): Promise<Producer | null> => {
      if (!this.getProducer({ id }) && this.transportExists({ id })) {
         const transportToReference = this.getTransport({ id })
         const newProducer: Producer = await transportToReference!.produce({
            kind,
            rtpParameters,
            appData,
         })
         // Note: we've created a new producer transport using given webRtc transport
         // This new transport has a different id
         const newId = newProducer.id
         // producer will close automatically since transport closed
         newProducer.on("transportclose", () => {
            debug(
               `Peer ${this.userMeta.name}'s producer with id ${id} is closing`,
            )
            this.removeProducer({ id: newProducer.id })
         })
         this.producers.set(newId, newProducer)
         //notify peers of my producing
         this.broadcastProducerToRoom({
            producerId: newId,
            appData,
            // appData: newProducer.appData,
         })
         return newProducer
      } else {
         return null
      }
   }

   addConsumer = async ({
      id,
      producerId,
      rtpCapabilities,
      appData,
      paused,
   }: {
      id: string
      producerId: string
      rtpCapabilities: RtpCapabilities
      appData: any
      paused: boolean | undefined
   }): Promise<ConsumeServerConsumeParams | null> => {
      if (
         this.router.canConsume({ producerId, rtpCapabilities }) &&
         this.transportExists({ id })
      ) {
         if (this.getConsumerOfProducer({ producerId }) !== null) {
            //This is here for tests
            debug("Consumer does not exist")
            return null
         }
         // debug(
         //    `Peer ${this.userMeta.name}'s router is able to consume producer with id ${producerId}`,
         // )
         // Consume the producer by calling transport.consume({ producerId, rtpCapabilities }).
         const transportToReference = this.getTransport({ id })

         const newConsumer = await transportToReference!.consume({
            producerId,
            rtpCapabilities,
            paused,
            appData,
         })
         //consumer will close automatically since transport closed
         newConsumer.on("transportclose", () => {
            debug(
               `Peer ${this.userMeta.name} received a transport closed notification with id ${producerId}`,
            )
            this.updateConsumerHelper({
               id: newConsumer.id,
               peerEntityUpdateType: "close",
               notifyClient: true,
            })
         })
         newConsumer.on("producerclose", () => {
            debug(
               `Peer ${this.userMeta.name} received a producer closed notification with id ${producerId}`,
            )
            this.updateConsumerHelper({
               id: newConsumer.id,
               peerEntityUpdateType: "close",
               notifyClient: true,
            })
         })
         newConsumer.on("producerpause", async () => {
            debug(
               `Peer ${this.userMeta.name} received a producer paused notification with id ${producerId}`,
            )
            this.updateConsumerHelper({
               id: newConsumer.id,
               peerEntityUpdateType: "pause",
               notifyClient: true,
            })
         })
         newConsumer.on("producerresume", async () => {
            debug(
               `Peer ${this.userMeta.name} received a producer resume notification with id ${producerId}`,
            )
            this.updateConsumerHelper({
               id: newConsumer.id,
               peerEntityUpdateType: "resume",
               notifyClient: true,
            })
         })

         //add transport to consumers collection
         this.consumers.set(newConsumer.id, newConsumer)
         return {
            id: newConsumer.id,
            kind: newConsumer.kind,
            rtpParameters: newConsumer.rtpParameters,
            producerId,
            appData: { },
         }
      } else {
         debug(
            `Peer ${this.userMeta.name}'s router is unable to consume producer with id ${producerId}`,
         )
         return null
      }
   }
   addDataProducer = async ({
      id,
      sctpStreamParameters,
      label,
      protocol,
      appData,
   }: {
      id: string
      sctpStreamParameters: SctpStreamParameters
      label: string
      protocol: string
      appData: any
   }): Promise<DataProducer | null> => {
      if (!this.getProducer({ id }) && this.transportExists({ id })) {
         const transportToReference = this.getTransport({ id })
         const newDataProducer: DataProducer =
            await transportToReference!.produceData({
               sctpStreamParameters,
               label,
               protocol,
               appData,
            })
         newDataProducer.on("transportclose", () => {
            this.removeDataProducer({ id: newDataProducer.id })
         })
         newDataProducer.on("close", () => {
            debug("Data producer has been observed closed", newDataProducer.id)
            this.removeDataProducer({ id: newDataProducer.id })
         })
         const newId = newDataProducer.id
         this.dataProducers.set(newId, newDataProducer)
         //notify peers of my join as new data producer
         this.broadcastDataProducerToRoom({
            dataProducerId: newId,
            appData: newDataProducer.appData,
         })
         return newDataProducer
      } else {
         return null
      }
   }
   broadcastProducerToRoom = ({
      producerId,
      appData,
   }: {
      producerId: string
      appData: any
   }) => {
      // Notify all OTHER peers in the room to consume producer
      // debug(
      //    `Peer ${this.userMeta.name} is broadcasting its arrival of new producer`,
      // )
      const producer = this.getProducer({ id: producerId })
      if (producer && !producer.closed) {
         this.socket.to(this.roomId).emit("newProducer", {
            peerId: this.userMeta.id,
            peerName: this.userMeta.name,
            producerId,
            appData,
         })
      }
   }
   broadcastProducersToPeer = ({
      userMeta,
      socketId,
   }: {
      userMeta: UserMeta
      socketId: string
   }) => {
      // Notify specific peer in the room to consume all producers
      debug(
         `Peer ${this.userMeta.name} is broadcasting all producers to peer ${userMeta.name}`,
      )
      this.producers.forEach((producer) => {
         if (!producer.closed || !producer.paused) {
            socketServer.to(socketId).emit("newProducer", {
               peerId: this.userMeta.id,
               peerName: this.userMeta.name,
               producerId: producer.id,
               appData: producer.appData,
            })
         }
      })
   }
   broadcastDataProducersToPeer = ({
      userMeta,
      socketId,
   }: {
      userMeta: UserMeta
      socketId: string
   }) => {
      // Notify specific peer in the room to consume all data producers
      // debug(
      //    `Peer ${this.userMeta.name} is broadcasting all data producers to peer ${userMeta.name}`,
      // )
      this.dataProducers.forEach((dataProducer) => {
         if (!dataProducer.closed) {
            socketServer.to(socketId).emit("newDataProducer", {
               peerId: this.userMeta.id,
               peerName: this.userMeta.name,
               dataProducerId: dataProducer.id,
               appData: dataProducer.appData,
            })
         }
      })
   }
   broadcastDataProducerToRoom = ({
      dataProducerId,
      appData,
   }: {
      dataProducerId: string
      appData: any
   }) => {
      // debug(
      //    `Peer ${this.userMeta.name} is broadcasting its arrival of new data producer`,
      // )
      const dataProducer = this.getDataProducer({ id: dataProducerId })
      if (dataProducer && !dataProducer.closed) {
         this.socket.to(this.roomId).emit("newDataProducer", {
            peerId: this.userMeta.name,
            dataProducerId,
            appData,
         })
      }
   }
   addDataConsumer = async ({
      id,
      dataProducerId,
      appData,
   }: {
      id: string
      dataProducerId: string
      appData: any
   }): Promise<ConsumeDataConsumerParams | null> => {
      if (this.transportExists({ id })) {
         const transportToReference = this.getTransport({ id })

         const newDataConsumer = await transportToReference!.consumeData({
            dataProducerId,
            appData,
         })
         newDataConsumer.on("transportclose", () => {
            debug(
               `Peer ${this.userMeta.name} received a transport closed notification with id ${newDataConsumer.id} in data consumer`,
            )
            this.removeDataConsumer({ id: newDataConsumer.id })
         })
         newDataConsumer.on("dataproducerclose", () => {
            debug(
               `Peer ${this.userMeta.name} received a data producer closed notification with id ${newDataConsumer.id} in data consumer`,
            )
            this.removeDataConsumer({ id: newDataConsumer.id })
         })
         newDataConsumer.on("close", () => {
            debug("Data consumer has been observed closed", newDataConsumer.id)
            this.removeDataConsumer({ id: newDataConsumer.id })
         })

         //add data consumer to data consumers collection
         this.dataConsumers.set(newDataConsumer.id, newDataConsumer)
         return {
            id: newDataConsumer.id,
            dataProducerId,
            sctpStreamParameters: newDataConsumer.sctpStreamParameters,
            label: newDataConsumer.label,
            protocol: newDataConsumer.protocol,
            appData: newDataConsumer.appData,
         }
      } else {
         debug(
            `Peer ${this.userMeta.name}'s router is unable to consume producer with id ${dataProducerId}`,
         )
         return null
      }
   }

   closeTransports = async () => {
      debug(`Peer ${this.userMeta.name} is closing all its transports`)
      //Producers and Consumers will close and delete themselves if any associated transport closes
      this.transports.forEach((t) => t.close())
   }

   //Incase peer tries to reconnect
   reinitializePeerConnection = async () => {
      this.transports = new Map()
      this.producers = new Map()
      this.consumers = new Map()
      this.dataProducers = new Map()
      this.dataConsumers = new Map()
   }

   debug = async () => {
      debug("")
      if (this.transports.size === 0) debug("No Transports")
      else {
         debug("Transports:")
         this.transports.forEach((t, tId) => debug(tId))
      }
      debug("")
      if (this.producers.size === 0) debug("No Producers")
      else {
         debug("Producers")
         this.producers.forEach((t, tId) =>
            debug({ id: tId, appData: t.appData, paused: t.paused }),
         )
      }
      debug("")
      if (this.consumers.size === 0) debug("No Consumers")
      else {
         debug("Consumers")
         this.consumers.forEach((t, tId) =>
            debug({ id: tId, appData: t.appData, paused: t.paused }),
         )
      }
      debug("")
      if (this.dataProducers.size === 0) debug("No Data Producers")
      else {
         debug("Data Producers")
         this.dataProducers.forEach((t, tId) =>
            debug({ id: tId, appData: t.appData, closed: t.closed }),
         )
      }
      debug("")
      if (this.dataConsumers.size === 0) debug("No Data Consumers")
      else {
         debug("Data Consumers")
         this.dataConsumers.forEach((t, tId) =>
            debug({ id: tId, appData: t.appData }),
         )
      }
      debug("")
   }
}

export default Peer
