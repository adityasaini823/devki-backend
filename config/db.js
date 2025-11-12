import mongoose from "mongoose";
const mongoURI = process.env.MONGO_URI;

export const connectToMongo = () => {
    mongoose.connect(mongoURI, {
      useNewUrlParser: true, 
      useUnifiedTopology: true, 
    })
    .then(() => {
      console.log('MongoDB connected successfully!');
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
      process.exit(1); // Exit process with failure
    });
}