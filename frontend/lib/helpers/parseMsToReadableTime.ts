//credit: https://stackoverflow.com/a/33909506/13886575

const parseMillisecondsIntoReadableTime = (milliseconds) => {
    //Get hours from milliseconds
    const hours = milliseconds / (1000 * 60 * 60)
    const absoluteHours = Math.floor(hours)
    const h = absoluteHours > 9 ? absoluteHours : '0' + absoluteHours

    //Get remainder from hours and convert to minutes
    const minutes = (hours - absoluteHours) * 60
    const absoluteMinutes = Math.floor(minutes)
    const m = absoluteMinutes > 9 ? absoluteMinutes : '0' + absoluteMinutes

    //Get remainder from minutes and convert to seconds
    const seconds = (minutes - absoluteMinutes) * 60
    const absoluteSeconds = Math.floor(seconds)
    const s = absoluteSeconds > 9 ? absoluteSeconds : '0' + absoluteSeconds


    return h + ':' + m + ':' + s
}
export default parseMillisecondsIntoReadableTime