const defautlBadgeStyles = "p-4 text-lg rounded-full badge badge-lg badge-outline"

const Connected = () => (
   <span className={`${defautlBadgeStyles} text-green-600 bg-green-200`}>
      Connected{" "}
      <span className="">
         <span className="absolute w-5 h-5 bg-green-400 rounded-full opacity-75 animate-ping"></span>
         <span className="relative inline-flex w-3 h-3 ml-1 bg-green-500 rounded-full "></span>
      </span>
   </span>
)
const Connecting = () => (
   <span className={`${defautlBadgeStyles} text-yellow-600 bg-yellow-200 `} >
      Connecting
   </span>
)
const Disconnected = () => (
   <span className={`${defautlBadgeStyles} text-red-600 bg-red-200 `}>
      Disconnected
   </span>
)
const Failure = () => (
   <span className={`${defautlBadgeStyles} text-red-600 bg-red-200  `} >
      Failure
   </span>
)

const ConnectionSwitch = ({
   connectionStatus,
}: {
   connectionStatus: string
}) => {
   switch (connectionStatus) {
      case "connected":
         return <Connected />
      case "connecting":
         return <Connecting />
      case "disconnected":
         return <Disconnected />
      case "failure":
         return <Failure />
      default:
         break
   }
}

const StatusComponent = ({
   connectionStatus,
}: {
   connectionStatus: string
}) => < >{ConnectionSwitch({ connectionStatus })}</>

export default StatusComponent
