const closeStream = (stream: MediaStream) => {
   console.log("Closing stream", stream.id)
   stream.getTracks().forEach((track) => {
      console.log("closing stream track for stream with id", stream.id)
      track.stop()
   })
}

export default closeStream
