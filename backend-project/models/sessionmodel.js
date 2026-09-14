import mongoose from "mongoose";

const questionschema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  questiontype: {
    type: String,
    enum: ["coding", "oral"],
    required: true,
  },
  idealAnswer: {
    type: String,
    default: "",
  },
  userAnswer: {
    type: String,
    default: "",
  },
  userSubmittedcode: {
    type: String,
    default: "",
  },
  issubmitted: {
    type: Boolean,
    default: false,
  },
  isEvaluated: {
    type: Boolean,
    default: false,
  },
  technicalScore: {
    type: Number,
    default: 0,
  },
  confidencescore: {
    type: Number,
    default: 0,
  },
  aiFeedback: {
    type: String,
    default: "Not yet submitted or evaluated",
  },
});

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      default: "Junior",
    },
    interviewType: {
      type: String,
      enum: ["Oral-only", "coding-mixed"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "failed"],
      default: "pending",
    },
    overallScore: {
      type: Number,
      default: 0,
    },
    metrics: {
      avgTechnicalScore: {
        type: Number,
        default: 0,
      },
      avgConfidenceScore: {
        type: Number,
        default: 0,
      },
    },
    questions: [questionschema],
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Session", sessionSchema);