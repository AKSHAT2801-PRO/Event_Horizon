const mongoose = require("mongoose")

const trajectorySchema = mongoose.Schema({
    "event_id" : {
        type : "string",
        required : true
    },
    "start_point" : {
        type : {"latitude" : {type : "double",required : true}
            ,"longitude" :{type : "double",required : true},
        "altitude" :{type : "double",required : true} },
        required : true
    },
    "end_point" : {
        type : {"latitude" : {type : "double",required : true}
            ,"longitude" :{type : "double",required : true},
        "altitude" :{type : "double",required : true} },
        required : true
    },
    "mass" : {
        type : "double",
        required : true
    },
    "initial_velocity" : {
        type : "double",
        required : true
    },
    "entry_angle_degree" : {
        type : "double",
        required : true
    },
    "median_residual_arcsec" : {
        type : "double",
        required : true
    },
    "quality_angle_q" : {
        type : "double",
        required : true
    }
})

const Trajectory_Result = mongoose.model("trajectory_results",trajectorySchema)

module.exports = Trajectory_Result