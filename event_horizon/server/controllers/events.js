const Event = require("../models/events")

async function handleSearchEvent(req,res){
    try{
        const searchQuery = req.query?.searchQuery || null
        const startDate = req.query?.start ? new Date(req.query.start) : null
        const endDate = req.query?.end ? new Date(req.query.end) : null
        let query = {}
        if (searchQuery){
            query.$or = [{shower_code : {$regex : searchQuery, $options : "i"}},
                {region : {$regex : searchQuery, $options : "i"}}]
        }
        if (startDate && endDate){
            query.datetime_utc = { $gte: startDate, $lte: endDate }
        }
        let events = await Event.find(query)
                            
        res.status(200).json(events)
    }
    catch(err){
        res.status(500).json({"message" : "Internal Server Error"})
    }
}

module.exports = {handleSearchEvent}