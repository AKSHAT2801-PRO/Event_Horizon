const mongoose = require("mongoose")
const orbitSchema = mongoose.Schema({
    "event_id": {
        type: "string",
        required: true
    },
    "a": {
        type: "double",
        required: true
    },
    "e": {
        type: "double",
        required: true
    },
    "i": {
        type: "double",
        required: true
    },
    "omega_a": {
        type: "double",
        required: true
    },
    "omega_b": {
        type: "double",
        required: true
    }
})

const Orbit_Results = mongoose.model("events", orbitSchema)

module.exports = Orbit_Results;