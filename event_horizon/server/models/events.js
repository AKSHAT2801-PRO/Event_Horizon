const mongoose = require("mongoose")

const eventSchema = mongoose.Schema({
    "event_id" : {
        type : "string",
        required : true
    },
    "datetime_utc" : {
        type : Date,
        required : true
    },
    "shower_code" : {
        type : "string",
        required : true
    },
    "station_count" : {
        type : "number",
        required : true
    },
    "peak_magnitude" : {
        type : "double",
        required : true
    },
    "approx_velocity" : {
        type : "number",
        required : true
    },
    "region" : {
        type : "string",
        required : true
    },
    "radiant" : {
        type : {"ra" : {type : "double",required : true},"dec" :{type : "double",required : true} },
        required : true
    }
})

const Event = mongoose.model("events",eventSchema)

module.exports = Event