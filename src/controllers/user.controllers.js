import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiErrors.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

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
  if(req.file && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){


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

export { registerUser };