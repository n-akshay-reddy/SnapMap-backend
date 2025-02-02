const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const placeSchema = new Schema({
    title: {type: String, required: true},
    description: {type: String, required: true},
    image: {type: String, required: true},
    address: {type: String, required: true},
    creator: {type: mongoose.Types.ObjectId, required: true, ref: "User"},
    createdAt: {type: Date, default: Date.now}  // Automatically sets current date and time
});

module.exports = mongoose.model("Place", placeSchema);
