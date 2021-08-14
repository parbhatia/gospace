import { RtpCodecCapability } from "mediasoup/lib/RtpParameters"
import { TransportListenIp } from "mediasoup/lib/Transport"
import { WorkerLogLevel, WorkerLogTag } from "mediasoup/lib/Worker"
import { cpus, networkInterfaces } from "os"
import { serverPort, serverListenIp } from "./index"

const getAnnouncedIp = () => {
   let defaultIp = "127.0.0.1"
   const allInterfaces = networkInterfaces()
   if (allInterfaces !== undefined) {
      for (const interfaceName of Object.keys(allInterfaces)) {
         for (const interFace of allInterfaces[interfaceName]!) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (interFace.family !== "IPv4" || interFace.internal !== false) {
               continue
            }
            // exit loop when first IPv4 address found
            defaultIp = interFace.address
            break
         }
      }
   }
   return defaultIp
}

const msconfig = {
   listenIp: serverListenIp,
   listenPort: serverPort,
   mediasoup: {
      //each mediasoup worker takes 1 cpu
      numWorkers: Object.keys(cpus()).length,
      worker: {
         rtcMinPort: 10000,
         rtcMaxPort: 10100,
         logLevel: "debug" as WorkerLogLevel,
         logTags: [
            "info",
            "ice",
            "dtls",
            "rtp",
            "sctp",
            "rtcp",
         ] as WorkerLogTag[],
      },
      router: {
         mediaCodes: [
            {
               kind: "audio",
               mimeType: "audio/opus",
               clockRate: 48000,
               channels: 2,
            },
            {
               kind: "video",
               mimeType: "video/VP8",
               clockRate: 90000,
               parameters: {
                  "x-google-start-bitrate": 1000,
               },
            },
         ] as RtpCodecCapability[],
      },
      webRtcTransport: {
         listenIps: [
            {
               ip: "0.0.0.0",
               announcedIp: getAnnouncedIp(),
            },
         ] as TransportListenIp[],
         maxIncomingBitrate: 1500000,
         initialAvailableOutgoingBitrate: 1000000,
      },
   },
}

export default msconfig
