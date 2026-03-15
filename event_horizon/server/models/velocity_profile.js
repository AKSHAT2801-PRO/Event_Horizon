const mongoose = require("mongoose")

const velocitySchema = mongoose.Schema({
    "event_id" : {
        type : "string",
        required : true
    },
    "points" : {
        type : [{"time" : {type : "double",required : true},
        "distance" : {type : "Double",required : true}}],
        required : true
    },
    "initial_velocity" : {
        type : "Double",
        required : true
    },
    "model" : {
        type : "string",
        required : true
    }
})

const Velocity_Profile = mongoose.model("velocity_profiles",velocitySchema)

module.exports = Velocity_Profile