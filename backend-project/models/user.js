import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: { 
      type: String,
      required: function() {
        return !this.googleId; // Password is required only if googleId is not present
      }
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    preferredRole: {
    type: String,
    default:"MERN STACK DEVELOPER"
  },
},{
  timestamps: true,
})

userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt)
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) {
    throw new Error('Password is not set for this user.');
  } 
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
  