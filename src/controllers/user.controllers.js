import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiErrors.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userId) => {
  try {

    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }

  } catch (error) {
    throw new apiError(500, "Something went wrong while generated access and refresh tokens")

  }
}

const registerUser = asyncHandler(async (req, res) => {


  const { fullname, username, email, password } = req.body;

  // 🔹 Check for empty fields
  if ([fullname, username, email, password].some((f) => !f || f.trim() === "")) {
    throw new apiError(400, "All fields are required");
  }

  // 🔹 Check if user already exists
  const existedUser = await User.findOne({
    $or: [{ username: username.toLowerCase() }, { email }],
  });

  if (existedUser) {
    throw new apiError(409, "User with this email or username already exists");
  }

  // 🔹 Get uploaded files
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  let coverImageLocalPath;
  if (req.file && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {


    coverImageLocalPath = req.files.coverImage[0].path
  }

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar is required");
  }

  // 🔹 Upload to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;

  if (!avatar || !avatar.url) {
    throw new apiError(500, "Failed to upload avatar");
  }

  // 🔹 Create user
  const user = await User.create({
    fullname,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // 🔹 Exclude sensitive fields
  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if (!createdUser) {
    throw new apiError(500, "Something went wrong while registering the user");
  }

  // 🔹 Return response
  return res.status(201).json(new apiResponse(201, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {

  //req body -> data
  //username or email
  //find the user
  //password check
  //access and refresh token
  //send cookies


  const { email, username, password } = req.body;
if (!username && !email) {
  throw new apiError(400, "Username or email is required")
}
  const user = await User.findOne({
    $or: [{ username }, { email }]
  })
  if (!user) {
    throw new apiError(404, "User does not exist")

  }

  const isPasswordValid = await user.isPasswordCorrect(password)
  if (!isPasswordValid) {
    throw new apiError(401, "Invalid user credentials")

  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true,

  }
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser, accessToken, refreshToken
        },
        "User logged In successfully"
      )
    )



})

const logOutUser = asyncHandler(async (req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }

    },
    {
      new: true
    }
  )

    const options = {
    httpOnly: true,
    secure: true,

  }
  
  return res
    .status(200)
    .clearCookie("accessToken" , options)
    .clearCookie("refreshToken" , options)
    .json(new apiResponse( 200 , {} , "User logged out"))

})

const refreshAccessToken =  asyncHandler(async(req , res) =>{

try {
       const incomingRefreshToken =    req.cookies.refreshToken || req.body.refreshToken
       if (!incomingRefreshToken) {
  
        throw new apiError(401 , "Unothorized request")
  
        
       }
  
       const decodedToken = jwt.verify(
        incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET
       )
     const user = await  User.findById(decodedToken?._id)
     if (!user) {
      throw new apiError(401 ,"Invalid refresh token")
      
     }
  
     if (incomingRefreshToken !== user?.refreshToken) {
       throw new apiError(401 ,"Refresh token is expired ior used")
      
     }
  
     const options ={
      httpOnly: true,
      secure: true,
     }
        const {accessToken , newRefreshToken} = await  generateAccessAndRefreshTokens(user._id)
     return res
      .status(200)
      .cookie("accessToken" , accessToken , options)
      .cookie("refreshToken" , newRefreshToken, options)
      .json(new apiResponse( 200 , {accessToken , refreshToken: newRefreshToken} , "Access token refreshed"))

} catch (error) {
  throw new apiError(401 , error?.message || "Invalid refresh token")
}
  
  })
export { registerUser, loginUser, logOutUser  , refreshAccessToken};