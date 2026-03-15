const mongoose = require("mongoose")

const stationSchema = mongoose.Schema({
    "station_name": {
        type: "string",
        required: true
    },
    "location": {
        type: {
            "latitude": { type: "Double", required: true },
            "longitude": { type: "Double", required: true },
            "altitude": { type: "Double", required: true }
        },
        required: true
    },
    "shower_code": {
        type: "string",
        required: true
    }
})

const Station = mongoose.model("stations", stationSchema)

module.exports = Station