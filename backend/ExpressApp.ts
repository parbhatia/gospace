import express from "express"
import cors from "cors"
import type { Express } from "express"


const createExpressApp = (): Express => {
    const app = express()
    app.use(cors)
    return app
}

export default createExpressApp