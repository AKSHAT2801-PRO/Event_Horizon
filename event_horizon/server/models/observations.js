const mongoose = require("mongoose")

const observationSchema = mongoose.Schema({
    "event_id" : {
        type : "String",
        required : true
    },
    "station_id" : {
        type : "String",
        required : true
    },
    "timestamp" : {
        type : "String",
        required : true
    },
    "sky_position" : {
        type : {"ra" : {type : "Double",required : true},"dec" :{type : "Double",required : true} },
        required : true
    }
})

const Observation = mongoose.model("observations",observationSchema)

module.exports = Observation