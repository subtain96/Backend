import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath) return null;

  try {
    // Normalize path for Windows
    const normalizedPath = localFilePath.replace(/\\/g, "/");

    // Upload the file to Cloudinary
    const response = await cloudinary.uploader.upload(normalizedPath, {
      resource_type: "auto",
      folder: "users", // optional: put all uploads in "users" folder
    });

    console.log("File uploaded successfully:", response.url);

    // Optionally remove local file after upload
    fs.unlink(normalizedPath, (err) => {
      if (err) console.error("Failed to delete local file:", err);
    });

    return response;
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    // Try deleting local file even if upload fails
    if (fs.existsSync(localFilePath)) {
      fs.unlink(localFilePath, (err) => {
        if (err) console.error("Failed to delete local file:", err);
      });
    }

    return null;
  }
};

export { uploadOnCloudinary };