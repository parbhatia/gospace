const Video = ({
   mediaRef,
}: {
   mediaRef: React.MutableRefObject<HTMLVideoElement>
}) => {
   return (
      <video
         className="border-4 border-black shadow-lg"
         muted
         loop
         autoPlay
         // controls
         playsInline
         ref={mediaRef}
      ></video>
   )
}

export default Video
