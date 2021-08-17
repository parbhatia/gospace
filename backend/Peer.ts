import { MediaKind, RtpParameters } from "mediasoup/lib/RtpParameters"
import {
   Router,
   Transport,
   DtlsParameters,
   IceCandidate,
   IceParameters,
   WebRtcTransport,
} from "mediasoup/lib/types"

import mediasoupConfig from "./config/mediasoup"
import { UserMeta } from "./types"

interface WebRtcTransportParams {
   id: String
   iceParameters: IceParameters
   iceCandidates: Array<IceCandidate>
   dtlsParameters: DtlsParameters
}

interface WebRtcTransportConstuctParams {
   userMeta: UserMeta
   router: Router
   transport: WebRtcTransport
   transportParams: WebRtcTransportParams
}
interface WebRtcTransportInitParams {
   userMeta: UserMeta
   router: Router
}

// A Peer associates a set of {transports, producers, consumers, websocket connection, metadata} of a client, inside a Room
class Peer {
   private userMeta: UserMeta
   private router: Router
   private transportParams: {
      id: String
      iceParameters: IceParameters
      iceCandidates: Array<IceCandidate>
      dtlsParameters: DtlsParameters
   }
   private transports: Map<string, Transport>
   private producerTransports: Map<string, Transport>
   private consumerTransports: Map<string, Transport>

   private constructor({
      userMeta,
      router,
      transport,
      transportParams,
   }: WebRtcTransportConstuctParams) {
      this.userMeta = userMeta
      this.router = router
      this.transports = new Map()
      this.producerTransports = new Map()
      this.consumerTransports = new Map()
      this.transports.set(transport.id, transport)
      this.transportParams = transportParams
      transport.on("dtlsstatechange", (dtlsState) => {
         console.log("DTLS STATE CHANGE!")
         if (dtlsState === "closed") {
            transport.close()
         }
      })
      transport.on("close", () => {
         console.log("Transport closed")
      })
   }
   // Creates an initial WebRtc connection on initialization
   // This is negotiated/created using a Router, it represents a network path to receive/send media.
   // *Note: Each Transport in mediasoup-client must be associated to a single WebRtcTransport in mediasoup server. I expected that this is clear in the doc: However, if you understood that two transports in the client can use the same transport in the server, then something is wrong in the doc.
   static init = async ({
      userMeta,
      router,
   }: WebRtcTransportInitParams): Promise<Peer> => {
      const { listenIps, maxIncomingBitrate, initialAvailableOutgoingBitrate } =
         mediasoupConfig.mediasoup.webRtcTransport
      const transport: WebRtcTransport = await router.createWebRtcTransport({
         listenIps,
         initialAvailableOutgoingBitrate,
         enableUdp: true,
         enableTcp: true,
         preferUdp: true,
      })
      // console.log(
      //    "created webrtc transport in peer in init -----------------------------",
      //    transport,
      // )
      await transport.setMaxIncomingBitrate(maxIncomingBitrate)
      const transportParams = {
         id: transport.id,
         iceParameters: transport.iceParameters,
         iceCandidates: transport.iceCandidates,
         dtlsParameters: transport.dtlsParameters,
      }
      const me = new Peer({
         userMeta,
         router,
         transport,
         transportParams,
      })

      return me
   }
   getUserMeta = () => this.userMeta
   getTransportParams = () => this.transportParams
   getTransport = ({ id }: { id: string }): Transport => {
      this.checkTransportExists({ id })
      return this.transports.get(id)!
   }
   private checkTransportExists = ({ id }: { id: string }) => {
      if (!this.transports.get(id)) {
         throw new Error("Transport does not exist")
      }
   }
   connectTransport = ({
      id,
      dtlsParameters,
   }: {
      id: string
      dtlsParameters: DtlsParameters
   }) => this.getTransport({ id }).connect({ dtlsParameters })
   getProducerTransport = ({ id }: { id: string }) =>
      this.producerTransports.get(id)
   getConsumerTransport = ({ id }: { id: string }) =>
      this.consumerTransports.get(id)
   setProducerTransport = async ({
      id,
      rtpParameters,
      kind,
   }: {
      id: string
      rtpParameters: RtpParameters
      kind: MediaKind
   }) => {
      const transportToAdd = this.getTransport({ id })
      await transportToAdd.produce({ kind, rtpParameters })
      //add transport to producers collection
      this.producerTransports.set(id, transportToAdd)
   }
}

export default Peer
