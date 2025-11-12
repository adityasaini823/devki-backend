import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    first_name: {
        type: String,
        required: true,
    },
    last_name: {
        type: String,
        required: false,
    },
    mobile: {
        type: String,
        required: true,
        unique: true, 
        index: true
    },
    email:{
      type: String,
      required: false,
      index: true
    },
    address:{
      type: String,
      required: true,
    },
    city:{
      type: String,
      required: true,
    },
    state:{
      type: String,
      required: true,
    },
    pincode:{
      type: String,
      required: true,
      index: true
    },
    country:{
      type: String,
      default: "India",
      required: true,
    },
    otp:{
      type: String,
      required: false,
    },
    otp_expiresAt:{
      type: Date,
      required: false,
    },
    refresh_token:{
      type: String,
      required: false,
      index: true
    },
    refreshToken_createdAt: {
      type: Date,
      required: false,
    },
    createdAt:{
      type: Date,
      default: Date.now,
    },
    updatedAt:{
      type: Date,
      default: Date.now,
    },
});
userSchema.index(
  { "otp_expiresAt": 1 }, 
  { expireAfterSeconds: 0, name: "otp_ttl_index" } 
);
userSchema.index(
  { "refreshToken_createdAt": 1 }, 
  { expireAfterSeconds: 0, name: "refreshToken_ttl_index" } 
);
export default mongoose.model('User', userSchema);

