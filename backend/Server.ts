import { createServer as createHttpsServer } from "https"
import type { Server } from 'https'
import { HTTPSCredentials } from "./types"
import type { Express } from "express"
import debugm from "debug"
const debug = debugm("app:Server")


const createServer = ({ httpsCredentials, expressApp, port }: { httpsCredentials: HTTPSCredentials, expressApp: Express, port: number }): Server => {
    const newServer = createHttpsServer(httpsCredentials, expressApp)
    newServer.listen(port, () => {
        debug(`Server started on port ${port}`)
    })
    return newServer
}

export default createServer