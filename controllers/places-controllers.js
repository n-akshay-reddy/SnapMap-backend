const fs = require("fs")
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const Place = require("../models/place-schema");
const User = require("../models/user-schema");

// -------------- Getting elements by user ID --------------------
const getPlacesByUserId = async (req, res, next) => {
    const userId = req.params.uid;

    let places;
    try {
        places = await Place.find({ creator: userId });
    } catch (err) {
        console.error("Error fetching places: ", err); // Log the error for debugging
        return next(new HttpError("Fetching places failed, please try again later.", 500));
    }

    if (!places || places.length === 0) {
        return next(new HttpError('Could not find places with the provided user ID.', 404));
    }

    res.json({ places: places.map(place => place.toObject({ getters: true })) });
};

// -------------- Getting element by ID ------------------
const getPlaceById = async (req, res, next) => {
    const placeId = req.params.pid;
    let place;
    try {
        place = await Place.findById(placeId);
    } catch (err) {
        console.error("Error finding place: ", err); // Log the error for debugging
        return next(new HttpError("Something went wrong, could not find a place.", 500));
    }

    if (!place) {
        return next(new HttpError('Could not find place with the provided ID.', 404));
    }

    res.json({ place: place.toObject({ getters: true }) });
};

// ------------- Creating a place ----------------
const createPlace = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error("Validation errors: ", errors.array()); // Log validation errors
        return next(new HttpError('Invalid inputs passed, check your data.', 422));
    }

    const { title, description, address} = req.body;

    const createdPlace = new Place({
        title,
        description,
        address,
        image: req.file.path, 
        creator: req.userData.userId
    });

    let user;
    try {
        user = await User.findById(req.userData.userId);
    } catch (err) {
        console.error('Error finding user: ', err); // Log the error for debugging
        return next(new HttpError('Database query failed, please try again later.', 500));
    }

    if (!user) {
        return next(new HttpError('Could not find the user, please check the provided user ID.', 404));
    }

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdPlace.save({ session: sess });
        user.places.push(createdPlace);
        await user.save({ session: sess });
        await sess.commitTransaction();
    } catch (err) {
        console.error('Transaction error: ', err); // Log the error for debugging
        return next(new HttpError('Transaction failed, please try again later.', 500));
    }

    res.status(201).json({ place: createdPlace });
};

//------------------ Updating Place -----------------
const updatePlace = async (req, res, next) => {

    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return next(new HttpError('Invalid inputs passed, please check your data.',422));
    }

    const { title, description } = req.body;
    const placeId = req.params.pid;

    let place;
    try {
        place = await Place.findById(placeId);
        if (!place) {
            return next(new HttpError("Could not find a place for the provided ID.", 404));
        }
    } catch (err) {
        console.error("Error finding place for update: ", err); // Log the error for debugging
        return next(new HttpError("Something went wrong, could not update place.", 500));
    }

    if(place.creator.toString() !== req.userData.userId){
        
        const error = new HttpError('You are not allowed to edit this place.',401);
        return next(error);
    }

    // Update properties if they are provided
    if (title) place.title = title;
    if (description) place.description = description;

    try {
        await place.save();
    } catch (err) {
        console.error("Error saving updated place: ", err); // Log the error for debugging
        return next(new HttpError("Something went wrong, could not update place.", 500));
    }

    res.status(200).json({ place: place.toObject({ getters: true }) });
};

// --------------- Deleting place ---------------------
const deletePlace = async (req, res, next) => {
    const placeId = req.params.pid;

    let place;
    let imagePath; // Declare imagePath here
    try {
        place = await Place.findById(placeId).populate('creator');
        if (!place) {
            return next(new HttpError("Could not find a place for the provided ID.", 404));
        }
        imagePath = place.image
    } catch (err) {
        console.error("Error finding place for deletion: ", err); // Log the error for debugging
        return next(new HttpError("Something went wrong, could not delete the place.", 500));
    }

    if(place.creator.toString() !== req.userData.userId){
        const error = new HttpError('You are not allowed to delete this place.',403);
        return next(error);
    }

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await place.deleteOne();
        place.creator.places.pull(place);
        await place.creator.save({ session: sess });
        await sess.commitTransaction();
    } catch (err) {
        console.error("Error deleting place: ", err); // Log the error for debugging
        return next(new HttpError("Something went wrong, could not delete the place.", 500));
    }

    fs.unlink(imagePath, err =>{
        console.log(err);
    });

    res.status(200).json({ message: "Deleted successfully" });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
