const Station = require("../models/stations")
async function handleStation(req, res) {
    try {
        const station_name = req.query.station_name
        const station_data = await Station.findOne({ station_name })
        if (station_data) {
            const data = {
                "station_name": station_data.station_name,
                "latitude": station_data.location.latitude,
                "longitude": station_data.location.longitude,
                "altitude": station_data.location.altitude,
                "shower_code": station_data.shower_code,
            }
            return res.status(200).json(data)
        }
        else {
            return res.status(204)
        }
    }
    catch (err) {
        console.log("Error: " + err)
        res.status(500).json({ "Message": "Error: " + err })
    }
}

module.exports = { handleStation }