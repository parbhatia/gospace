import useSvgAvatar from "../hooks/useSvgAvatar"

const AvatarComponent = ({ name }: { name: string | null }) => {
   const { svgRef } = useSvgAvatar(name)
   return (
      <div className={`w-full flex items-center`}>
         <div className="mr-2" ref={svgRef}></div>
         <div className="">
            <h2 className="text-xl font-bold text-gray-900 title-font">
               {name}
            </h2>
            {/* <h3 className="mb-3 text-gray-500">UI Developer</h3> */}
         </div>
      </div>
   )
}

export default AvatarComponent
