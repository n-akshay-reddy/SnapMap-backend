const {v4: userId} = require("uuid")
const {validationResult} = require("express-validator")
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');

const User = require("../models/user-schema");
const HttpError = require("../models/http-error")

// let DUMMY_USERS = [
//     {
//         id: "u1",
//         name: "Akshay",
//         email: "akshay@",
//         password: "1234567"
//     }
// ]

// ----------------- Getting all the users ---------------------

const getUsers = async (req,res,next) => {
    let users;
    try{
        users = await User.find({},"-password");
    } catch(err){
        const error = new HttpError("Fetching users failed, plese try again later",500);
        return next(error);
    }
    res.json({users: users.map(user => user.toObject({getters: true}))});
};

// ----------------- Signup ---------------------

const signup = async (req,res,next) => {

    const error = validationResult(req);
    if(!error.isEmpty()){
        console.log(error);
        return next(new HttpError('Invalid inputs passed check your data',422));
    }

    const {name, email,password} = req.body;

    let existingUser;

    try{
        existingUser = await User.findOne({email: email})
    } catch(err){
        const error = new HttpError('Signing up failed, please try again later.',500);
        return next(error);
    }

    if(existingUser){
        const error = new HttpError("User exists already, please login instead.",422);
        return next(error)
    }


    let hashedPassword;
    try{
        hashedPassword = await bcrypt.hash(password,12);
    }catch(err) {
        const error = new HttpError('Could not create user, plese try again.',500);
        return next(error);
    }

    const createdUser = new User({
        name,
        email,
        image: req.file.path,
        password: hashedPassword,
        places: []
    });

    try{
        await createdUser.save();
    } catch(err) {
        const error = new HttpError('Signing up failed, please try again',500);
        console.log("i am here")
        return next(error);
    }

    let token;
    try{
        token = jwt.sign({userId: createdUser.id, email:createdUser.email },process.env.PRIVATE_KEY,{expiresIn: '1h'});

    }catch(err){
        const error = new HttpError('Signing up failed, please try again later.',500);
        return next(error);
    }

    res.status(201).json({ userId: createdUser.id, email:createdUser.email, token: token});
};

// ------------- Login ---------------------

const login = async (req,res,next) => {

    const {email,password} = req.body;

    let existingUser;

    try{
        existingUser = await User.findOne({email: email})
        if(!existingUser){
            const error = new HttpError('Email doesn\'t exists, please try again later.',500);
            return next(error);
        }
    } catch(err){
        const error = new HttpError('Logging in failed, please try again later.', 500);
        return next(error);
        
    }

    let isValidPassword = false;
    
    try{
        isValidPassword = await bcrypt.compare(password,existingUser.password);
    }catch(err) {
        const error = new HttpError("credentials wrong, plese try again",500);
        return next(error);
    }

    if(!isValidPassword){
        const error = new HttpError('Invalid credentials, could not log you in.',401);
        return next(error);
    }

    let token;
    try{
        token = jwt.sign({userId: existingUser.id, email:existingUser.email },process.env.PRIVATE_KEY,{expiresIn: '1h'});

    }catch(err){
        const error = new HttpError('Logging in failed, please try again later.',500);
        return next(error);
    }
    
    res.json({userId: existingUser.id, email: existingUser.email, token: token});
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;