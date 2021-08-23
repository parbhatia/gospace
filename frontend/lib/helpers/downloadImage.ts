const downloadImage = (data, filename = "untitled.jpeg") => {
   var a = document.createElement("a")
   a.href = data
   a.download = filename
   document.body.appendChild(a)
   a.click()
}
export default downloadImage
