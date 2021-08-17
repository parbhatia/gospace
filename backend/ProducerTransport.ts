interface ProducerTransportConstuctParams {}
interface ProducerTransportInitParams {}

//WebRtcTransport negotiated/created using a Router, represents a network path to receive/send media
class ProducerTransport {
   private constructor({}: ProducerTransportConstuctParams) {}
   static init =
      async ({}: ProducerTransportInitParams): Promise<ProducerTransport> => {
         const me = new ProducerTransport({})
         return me
      }
}

export default ProducerTransport

// interface ProducerTransportConstuctParams {}
// interface ProducerTransportInitParams {}

// //WebRtcTransport negotiated/created using a Router, represents a network path to receive/send media
// class ProducerTransport {
//    private constructor({}: ProducerTransportConstuctParams) {}
//    static init =
//       async ({}: ProducerTransportInitParams): Promise<ProducerTransport> => {
//          const me = new ProducerTransport({})
//          return me
//       }
// }

// export default ProducerTransport
