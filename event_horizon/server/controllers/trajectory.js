const Trajectory_Result = require('../models/trajectory_results')

async function handleMeteorData(req,res){
    try{
        const event_id = req.query.event_id
        const trajectory = await Trajectory_Result.findOne({event_id})
        const start_point = trajectory.start_point
        const end_point = trajectory.end_point
        const data = {
            "startLat": start_point.latitude,
            "startLng": start_point.longitude,
            "startAltKm": start_point.altitude,
            "endLat":end_point.latitude,
            "endLng": end_point.longitude,
            "endAltKm":end_point.altitude,
            "mass" : trajectory.mass,
            "initial_velocity" : trajectory.initial_velocity,
        }
        res.status(200).json(data)
    }
    catch(err){
        console.log(err)
        res.status(500).json({"message" : "Invalid Data" + err})

    }

}

module.exports =  {handleMeteorData} 

// {
//     id: "kpg",
//     label: "K-Pg Impactor (~66 Ma)",
//     type: "impactor",
//     description: "~10km asteroid, ended Cretaceous. Yucatan peninsula impact.",
    // startLat: 35.0,
    // startLng: -115.0,
    // startAltKm: 8000,
    // endLat: 21.4,
    // endLng: -89.5,
    // endAltKm: 0,
//     ...velToward(35.0, -115.0, 8000, 21.4, -89.5, 0, 20.0),
//     m0: 500,
//     k: 0.02,
//     color: "#ff0044",
//     willImpact: true,
// }