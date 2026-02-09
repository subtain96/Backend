import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiErrors.js"
import { User } from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";


const registerUser = asyncHandler(async (req, res) => {
    //Get  user detail from frontend
    // validation - not empty
    // check if user is already exist: username and email
    // check for images check for avatar
    // upload them to the cloudinary , avatar
    // create user object - create entry in db
    // remove password and refresh token from token
    // check for user creation 
    // return response


    const { fullname, username, email, password } = req.body;
    console.log("email: ", email);
    console.log("password: ", password)

    // if(fullname === ""){
    //    throw new apiError(400 , "Full Name is required")
    // } For single check for all required all the if 

    if ([fullname, email, username, password].some((field) => field === "")
    ) {

        throw new apiError(400, "All fields are required")

    }

    const existedUser = User.findOne({
        $or: [{ usernaem }, { email }]
    })
 

     if (existedUser) {
       
        throw new apiError(409 , "User with this email and username is already exist")
     }

   

    const avatarLocalPath =  req.files?.avatar[0]?.path;
    const coverImageLocalPath =  req.files?.coverImage[0]?.path;

    if (!avatarLocalPath)
    {
        throw new apiError (400 , "avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

     if (!avatar)
    {
        throw new apiError (400 , "avatar is required")
    }

   const user = await  User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser= await User.findById(user._id).select(
        "-password -refreshToken "
    )


    if(!createdUser){
        throw new apiError(500 , "Something went wrong while registring the user")
    }

    return res.status(201).json(

        new apiResponse(200 , createdUser , "User registern Successfuly")
    )
})


export { registerUser }