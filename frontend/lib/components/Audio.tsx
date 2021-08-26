const Audio = ({
   mediaRef,
}: {
   mediaRef: React.MutableRefObject<HTMLAudioElement>
}) => {
   return (
      <audio
         className="border-4 border-black shadow-lg"
         autoPlay
         controls
         playsInline
         ref={mediaRef}
      ></audio>
   )
}

export default Audio
