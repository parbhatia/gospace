const Connected = () => (
   <span className="px-4 py-2 text-base text-green-600 bg-green-200 rounded-full ">
      Connected
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
}) => <div className="">{ConnectionSwitch({ connectionStatus })}</div>

export default StatusComponent
