const mongoose = require("mongoose")
async function connectDb(URI){
    return await mongoose.connect(URI).then(()=>{
        try{
            console.log("MonogoDb database Connected")
        }catch(err){
            console.log("Error: "+ err)
        }
    })
}

module.exports = {connectDb}