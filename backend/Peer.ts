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
} from "mediasoup/lib/types"
import { Socket } from "socket.io"

import mediasoupConfig from "./config/mediasoup"
import {
   WebRtcTransportParams,
   UserMeta,
   ConsumeServerConsumeParams,
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
         })
      await transport.setMaxIncomingBitrate(maxIncomingBitrate)
      const transportParams: WebRtcTransportParams = {
         id: transport.id,
         iceParameters: transport.iceParameters,
         iceCandidates: transport.iceCandidates,
         dtlsParameters: transport.dtlsParameters,
      }
      transport.on("dtlsstatechange", (dtlsState) => {
         // console.log("DTLS STATE CHANGE!", dtlsState)
         if (dtlsState === "closed") {
            transport.close()
            // console.log("Transport closed")
         }
      })
      transport.on("close", () => {
         // console.log("Transport closed")
      })
      this.transports.set(transport.id, transport)
      return transportParams
   }
   getUserMeta = () => this.userMeta

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
         console.log("CONNECTING TRANSPORT WITH ID", id, this.userMeta.id)
         await transport.connect({ dtlsParameters })
      }
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
         this.producerTransports.set(newId, newProducerTransport)
         //notify peers of my producing
         this.broadcastFrom({ producerTransportId: newId })
         return newProducerTransport
      } else {
         return null
      }
   }
   broadcastFrom = ({
      producerTransportId,
   }: {
      producerTransportId: string
   }) => {
      // Notify all OTHER peers in the room that new peer has been added a producer, and peers should start consuming
      // calling .to() with the original socket will only emit to everyone in the room, but original socket client
      console.log(
         `Peer ${this.userMeta.name} is broadcasting its arrival as new producer`,
      )
      this.socket.to(this.roomId).emit("newProducer", {
         peerId: this.userMeta.name,
         producerTransportId,
      })
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
      // console.log(
      //    `Peer ${this.userMeta.name}'s router's RTPcabilities are:`,
      //    this.router.rtpCapabilities,
      // )
      // console.log(
      //    `Peer ${this.userMeta.name}'s provided rtpCapabilities are:`,
      //    rtpCapabilities,
      // )
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
   }
}

// resumeConsumer = async ({ id }: { id: string }) => {
//    if (this.getConsumerTransport({ id })) {
//       await this.getConsumerTransport({ id })!.resume()
//    }
// }

export default Peer
