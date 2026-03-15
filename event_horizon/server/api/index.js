const express = require("express")
const {logger} = require('../middleware/logs')
const handleEvent = require("../routes/event")
const handleMeteor = require("../routes/trajectory")
const handleStation = require("../routes/station")
const dotenv = require("dotenv")
const cors = require("cors")
dotenv.config()
const {connectDb} = require('../services/dbConnection')
const app = express()

//middlewares----
app.use(express.json(extended = true));
app.use(cors({
    origin: "*",
    methods: ["GET","POST","PUT","DELETE","PATCH"],
    allowedHeaders: ["Content-Type"]
}))
app.use(express.urlencoded({ extended: false }));
app.use(logger)

// const trajectory_results = require('../models/trajectory_results')
// trajectory_results.insertMany({
//   "event_id": "EVT_20250314_001",
//   "start_point": {
//     "latitude": 22.5726,
//     "longitude": 88.3639,
//     "altitude": 102.5
//   },
//   "end_point": {
//     "latitude": 23.1200,
//     "longitude": 87.9000,
//     "altitude": 35.2
//   },
//   "entry_angle_degree": 42.7,
//   "median_residual_arcsec": 1.84,
//   "quality_angle_q": 0.93
// })


// const Station = require("../models/stations")
// Station.insertMany({
//   "station_name": "IN0041",
//   "location": {
//     "latitude": 18.5204,
//     "longitude": 73.8567,
//     "altitude": 560.0
//   },
//   "shower_code": "PER"
// })
// mongo db connection-----
connectDb(process.env.MongoDB_URL)

app.use('/api/event',handleEvent)  //  /api/event/?searchQuery,start,end
app.use('/api/meteor',handleMeteor) // /api/meteor/trajectory/?event_id
app.use("/api/station",handleStation) // /api/station/recorded/?station_name


app.get('/',(req,res)=>{
    res.send("<h1>Backend is Running</h2>")
})

app.listen(8008,()=>{
    console.log("App is Running on port: 8008")
})
