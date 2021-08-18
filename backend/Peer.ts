import { MediaKind, RtpParameters } from "mediasoup/lib/RtpParameters"
import {
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
import { Socket } from "socket.io"

import mediasoupConfig from "./config/mediasoup"
import {
   WebRtcTransportParams,
   UserMeta,
   ConsumeServerConsumeParams,
   ConsumeDataConsumerParams,
} from "./types"
interface WebRtcTransportConstuctParams {
   userMeta: UserMeta
   router: Router
   socket: Socket
   roomId: string
}

// A Peer associates a set of {transports, producers, consumers, websocket connection, metadata} of a client, inside a Room
class Peer {
   private userMeta: UserMeta
   private router: Router
   private roomId: string
   private socket: Socket
   // private transportParams: {
   //    id: String
   //    iceParameters: IceParameters
   //    iceCandidates: Array<IceCandidate>
   //    dtlsParameters: DtlsParameters
   // }
   private transports: Map<string, Transport>
   private producerTransports: Map<string, Producer>
   private consumerTransports: Map<string, Consumer>
   private dataProducers: Map<string, DataProducer>
   private dataConsumers: Map<string, DataConsumer>

   constructor({
      userMeta,
      router,
      socket,
      roomId,
   }: WebRtcTransportConstuctParams) {
      this.userMeta = userMeta
      this.router = router
      this.socket = socket
      this.roomId = roomId
      this.transports = new Map()
      this.producerTransports = new Map()
      this.consumerTransports = new Map()
      this.dataProducers = new Map()
      this.dataConsumers = new Map()
   }
   // This is negotiated/created using a Router, it represents a network path to receive/send media.
   // *Note: Each Transport in mediasoup-client must be associated to a single WebRtcTransport in mediasoup server. I expected that this is clear in the doc: However, if you understood that two transports in the client can use the same transport in the server, then something is wrong in the doc.
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
         }
      })
      transport.on("routerclose", () => {
         this.removeTransport({ id: transport.id })
      })
      transport.on("close", () => {
         this.removeTransport({ id: transport.id })
      })
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
         console.log(
            `Peer ${this.userMeta.name} has connected transportwith id ${id}`,
         )
         await transport.connect({ dtlsParameters })
      }
   }
   removeTransport = ({ id }: { id: string }) => {
      this.transports.delete(id)
   }
   removeConsumerTransport = ({
      id,
      notifyClient = false,
   }: {
      id: string
      notifyClient: boolean
   }) => {
      console.log(
         `Peer ${this.userMeta.name} needs to remove consumer of id ${id}`,
      )
      if (notifyClient) {
         this.socket.emit("removeConsumer", {
            id,
         })
      }
      this.consumerTransports.delete(id)
   }
   removeProducerTransport = ({ id }: { id: string }) => {
      this.producerTransports.delete(id)
   }
   removeDataProducer = ({ id }: { id: string }) => {
      this.dataProducers.delete(id)
   }
   removeDataConsumer = ({ id }: { id: string }) => {
      this.dataConsumers.delete(id)
   }

   getProducerTransport = ({ id }: { id: string }) =>
      this.producerTransports.get(id)
   getConsumerTransport = ({ id }: { id: string }) =>
      this.consumerTransports.get(id)
   addProducerTransport = async ({
      id,
      rtpParameters,
      kind,
   }: {
      id: string
      rtpParameters: RtpParameters
      kind: MediaKind
   }): Promise<Producer | null> => {
      if (!this.getProducerTransport({ id }) && this.transportExists({ id })) {
         const transportToReference = this.getTransport({ id })
         const newProducerTransport: Producer =
            await transportToReference!.produce({ kind, rtpParameters })
         // Note: we've created a new producer transport using given webRtc transport
         // This new transport has a different id
         const newId = newProducerTransport.id
         newProducerTransport.on("transportclose", () => {
            this.removeProducerTransport({ id: newProducerTransport.id })
         })
         this.producerTransports.set(newId, newProducerTransport)
         //notify peers of my producing
         this.broadcastNewProducer({ producerTransportId: newId })
         return newProducerTransport
      } else {
         return null
      }
   }
   addDataProducer = async ({
      id,
      sctpStreamParameters,
      label,
      protocol,
   }: {
      id: string
      sctpStreamParameters: SctpStreamParameters
      label: string
      protocol: string
   }): Promise<DataProducer | null> => {
      if (!this.getProducerTransport({ id }) && this.transportExists({ id })) {
         const transportToReference = this.getTransport({ id })
         const newDataProducer: DataProducer =
            await transportToReference!.produceData({
               sctpStreamParameters,
               label,
               protocol,
            })
         newDataProducer.on("transportclose", () => {
            this.removeDataProducer({ id: newDataProducer.id })
         })
         const newId = newDataProducer.id
         this.dataProducers.set(newId, newDataProducer)
         //notify peers of my join as new data producer
         this.broadcastNewDataProducer({ dataProducerId: newId })
         return newDataProducer
      } else {
         return null
      }
   }
   broadcastNewProducer = ({
      producerTransportId,
   }: {
      producerTransportId: string
   }) => {
      // Notify all OTHER peers in the room that new peer has been added a producer, and peers should start consuming
      // calling .to() with the original socket will only emit to everyone in the room, but original socket client
      console.log(
         `Peer ${this.userMeta.name} is broadcasting its arrival of new producer`,
      )
      this.socket.to(this.roomId).emit("newProducer", {
         peerId: this.userMeta.name,
         producerTransportId,
      })
   }
   broadcastNewDataProducer = ({
      dataProducerId,
   }: {
      dataProducerId: string
   }) => {
      console.log(
         `Peer ${this.userMeta.name} is broadcasting its arrival of new data producer`,
      )
      this.socket.to(this.roomId).emit("newDataProducer", {
         peerId: this.userMeta.name,
         dataProducerId,
      })
   }
   addDataConsumer = async ({
      id,
      dataProducerId,
   }: {
      id: string
      dataProducerId: string
   }): Promise<ConsumeDataConsumerParams | null> => {
      if (this.transportExists({ id })) {
         console.log(
            `Peer ${this.userMeta.name}'s router is able to consume data producer with id ${dataProducerId}`,
         )
         const transportToReference = this.getTransport({ id })

         const newDataConsumer = await transportToReference!.consumeData({
            dataProducerId,
         })
         newDataConsumer.on("transportclose", () => {
            this.removeDataConsumer({ id: newDataConsumer.id })
         })
         newDataConsumer.on("dataproducerclose", () => {
            this.removeDataConsumer({ id: newDataConsumer.id })
         })

         //add data consumer to data consumers collection
         this.dataConsumers.set(id, newDataConsumer)
         return {
            id: newDataConsumer.id,
            dataProducerId,
            sctpStreamParameters: newDataConsumer.sctpStreamParameters,
            label: newDataConsumer.label,
            protocol: newDataConsumer.protocol,
         }
      } else {
         console.log(
            `Peer ${this.userMeta.name}'s router is unable to consume producer with id ${dataProducerId}`,
         )
         return null
      }
   }
   addConsumerTransport = async ({
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
         console.log(
            `Peer ${this.userMeta.name}'s router is able to consume producer with id ${producerId}`,
         )
         // Consume the producer by calling transport.consume({ producerId, rtpCapabilities }).
         const transportToReference = this.getTransport({ id })

         const newConsumerTransport = await transportToReference!.consume({
            producerId,
            rtpCapabilities,
            paused,
            appData,
         })
         newConsumerTransport.on("transportclose", () => {
            this.removeConsumerTransport({
               id: newConsumerTransport.id,
               notifyClient: true,
            })
         })
         newConsumerTransport.on("producerclose", () => {
            console.log(
               `Peer ${this.userMeta.name}'s received a producer closed notification with id ${producerId}`,
            )
            this.removeConsumerTransport({
               id: newConsumerTransport.id,
               notifyClient: true,
            })
         })
         //add transport to consumers collection
         this.consumerTransports.set(id, newConsumerTransport)
         return {
            id: newConsumerTransport.id,
            kind: newConsumerTransport.kind,
            rtpParameters: newConsumerTransport.rtpParameters,
            producerId,
            appData: {},
         }
      } else {
         console.log(
            `Peer ${this.userMeta.name}'s router is unable to consume producer with id ${producerId}`,
         )
         return null
      }
   }
   closeTransports = async () => {
      console.log(`Peer ${this.userMeta.name} is closing all its transports`)
      this.transports.forEach((t) => t.close())
      this.producerTransports.forEach((t) => t.close())
      this.consumerTransports.forEach((t) => t.close())
      this.dataProducers.forEach((t) => t.close())
      this.dataConsumers.forEach((t) => t.close())
   }
}

// resumeConsumer = async ({ id }: { id: string }) => {
//    if (this.getConsumerTransport({ id })) {
//       await this.getConsumerTransport({ id })!.resume()
//    }
// }

export default Peer
