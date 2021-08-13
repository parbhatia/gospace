import { RtpCodecCapability } from "mediasoup/lib/RtpParameters"
import { TransportListenIp } from "mediasoup/lib/Transport"
import { WorkerLogTag } from "mediasoup/lib/Worker"
import { cpus, networkInterfaces } from "os"

//refactored from github/miroslavpejic85
const getAnnouncedIp = () => {
   let defaultIp = "127.0.0.1"
   const allInterfaces = networkInterfaces()
   if (allInterfaces !== undefined) {
      Object.keys(allInterfaces).forEach((interfaceName) => {
         for (const interFace of allInterfaces[interfaceName]!) {
            // Ignore IPv6 and 127.0.0.1
            if (interFace.family !== "IPv4" || interFace.internal !== false) {
               continue
            }
            // Set the local ip to the first IPv4 address found and exit the loop
            defaultIp = interFace.address
            return
         }
      })
   }
   return defaultIp
}

const msconfig = {
   listenIp: "0.0.0.0",
   listenPort: 3016,
   mediasoup: {
      //each mediasoup worker takes 1 cpu
      numWorkers: Object.keys(cpus()).length,
      worker: {
         rtcMinPort: 10000,
         rtcMaxPort: 10100,
         logLevel: "debug",
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
