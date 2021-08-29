const Connected = () => (
   <span className="px-4 py-2 text-base text-green-600 bg-green-200 rounded-full ">
      Connected{" "}
      <span className="w-3 h-3">
         <span className="absolute w-4 h-4 bg-green-400 rounded-full opacity-75 animate-ping"></span>
         <span className="relative inline-flex w-3 h-3 bg-green-500 rounded-full "></span>
      </span>
   </span>
)
const Connecting = () => (
   <span className="px-4 py-2 text-base text-yellow-600 bg-yellow-200 rounded-full ">
      Connecting
   </span>
)
const Disconnected = () => (
   <span className="px-4 py-2 text-base text-red-600 bg-red-200 rounded-full ">
      Disconnected
   </span>
)
const Failure = () => (
   <span className="px-4 py-2 text-base text-red-600 bg-red-200 rounded-full ">
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
}) => <div >{ConnectionSwitch({ connectionStatus })}</div>

export default StatusComponent
