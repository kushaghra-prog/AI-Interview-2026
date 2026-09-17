import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Session from "../models/sessionmodel.js";
import fetch from "node-fetch";
import path from "path";
import fs from "fs";
import FormData from "form-data";

const AI_SERVICE_URL = "http://localhost:8000";

const pushSocketUpdate = (io, userId, sessionId, message, status, session = null) => {
  if (!io) return;

  io.to(userId).emit("sessionUpdate", {
    sessionId,
    message,
    status,
    session,
  });
};

const createSession = asyncHandler(async (req, res) => {
  const { role, level, interviewType, count } = req.body;
  const userId = req.user._id;

  if (!role || !level || !interviewType || !count) {
    res.status(400);
    throw new Error("Please provide all required fields");
  }

  const questionCount = Number(count);
  if (!Number.isFinite(questionCount) || questionCount <= 0) {
    res.status(400);
    throw new Error("Count must be a positive number");
  }

  const session = await Session.create({
    user: userId,
    role,
    level,
    interviewType,
    status: "pending",
  });

  const io = req.app.get("io");
  res.status(201).json({
    message: "Session created successfully",
    sessionId: session._id,
    status: "processing",
  });

  (async () => {
    try {
      pushSocketUpdate(
        io,
        userId,
        session._id,
        "AI generating questions...",
        `Generating ${questionCount} question(s) for ${level} level ${role} role interview...`
      );

      const aiResponse = await fetch(`${AI_SERVICE_URL}/generate-question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          level,
          count: questionCount,
          interview_type:interviewType,
        }),
      });

      if (!aiResponse.ok) {
        const errorBody = await aiResponse.text();
        throw new Error(`AI service error ${aiResponse.status} - ${errorBody}`);
      }

      const aiData = await aiResponse.json();
      const codingCount = interviewType === "coding-mixed" ? Math.floor(questionCount * 0.2) : 0;
      const rawQuestions = (aiData.question || [])
        .map(q => typeof q === 'string' ? q.trim() : (q.questionText || "").trim())
        .filter(q => q.length > 0);

      if (rawQuestions.length === 0) {
        throw new Error("AI service returned no valid questions");
      }

      const questions = rawQuestions.map((q, index) => ({
        questionText: q,
        questiontype: index < codingCount ? "coding" : "oral",
        idealAnswer: "",
        userAnswer: "",
        userSubmittedcode: "",
        issubmitted: false,
        isEvaluated: false,
        technicalScore: 0,
        confidencescore: 0,
        aiFeedback: "Not yet submitted or evaluated",
      }));

      session.questions = questions;
      session.status = "in-progress";
      await session.save();

      pushSocketUpdate(io, userId, session._id, "Questions ready", "Starting interview...", session);
    } catch (error) {
      console.error(`Session creation failed: ${error.message}`);
      session.status = "failed";
      await session.save();
      pushSocketUpdate(io, userId, session._id, "Session creation failed", `Error: ${error.message}`);
    }
  })();
});

const getSession = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const sessions = await Session.find({ user: userId }).select("-questions");
  res.status(200).json(sessions);
});

const getSessionById = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  const userId = req.user._id;
  const session = await Session.findOne({ _id: sessionId, user: userId });

  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }

  res.status(200).json(session);
});

const deleteSession = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const sessionId = req.params.id;
  const session = await Session.findOne({ _id: sessionId, user: userId });

  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }

  await Session.deleteOne({ _id: sessionId, user: userId });
  res.status(200).json({ id: sessionId, message: "Session deleted successfully" });
});

const calculateOverallScore = async (sessionId) => {
  const results = await Session.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(sessionId),
      },
    },
    {
      $unwind: "$questions",
    },
    {
      $group: {
        _id: "$_id",
        avgTechnicalScore: {
          $avg: {
            $cond: [
              { $eq: ["$questions.isEvaluated", true] },
              "$questions.technicalScore",
              0,
            ],
          },
        },
        avgConfidenceScore: {
          $avg: {
            $cond: [
              { $eq: ["$questions.isEvaluated", true] },
              "$questions.confidencescore",
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        overallScore: {
          $round: [{ $avg: ["$avgTechnicalScore", "$avgConfidenceScore"] }, 0],
        },
        avgTechnicalScore: { $round: ["$avgTechnicalScore", 0] },
        avgConfidenceScore: { $round: ["$avgConfidenceScore", 0] },
      },
    },
  ]);

  return results[0] || {
    overallScore: 0,
    avgTechnicalScore: 0,
    avgConfidenceScore: 0,
  };
};

const evaluateAnswerAsync = async (
  io,
  userId,
  sessionId,
  questionIdx,
  audioFilepath = null,
  codeSubmission = null
) => {
  const questionIndex =
    typeof questionIdx === "string"
      ? parseInt(questionIdx, 10)
      : questionIdx;

  const session = await Session.findById(sessionId);

  if (!session || session.user.toString() !== userId.toString()) {
    console.error("Session not found or user unauthorized");
    return;
  }

  if (questionIndex < 0 || questionIndex >= session.questions.length) {
    console.error(`Question index ${questionIndex} out of bounds`);
    return;
  }

 const question = session.questions[questionIndex];

  if (!question) {
    pushSocketUpdate(
      io,
      userId,
      sessionId,
      `Question not found at index ${questionIndex}`,
      "Evaluation failed"
    );
    return;
  }

  let transcription = "";

  // Step 1: Transcribe audio if provided
  if (audioFilepath) {
    try {
      pushSocketUpdate(
        io,
        userId,
        sessionId,
        "AI_TRANSCRIPTION",
        `Transcribing question ${questionIndex + 1}...`
      );

      const formData = new FormData();
      formData.append("file", fs.createReadStream(audioFilepath));

      const transResponse = await fetch(`${AI_SERVICE_URL}/transcribe`, {
        method: "POST",
        body: formData,
        headers: formData.getHeaders(),
      });

      if (!transResponse.ok) {
        const errorBody = await transResponse.text();
        throw new Error(
          `AI transcription service error ${transResponse.status} - ${errorBody}`
        );
      }

      const transData = await transResponse.json();
      transcription = transData.transcription || "";
    } catch (error) {
      console.error(`Transcription failed: ${error.message}`);
      pushSocketUpdate(io, userId, sessionId, "Transcription failed", `Error: ${error.message}`);
      // Continue to evaluation even if transcription fails
    } finally {
      if (audioFilepath && fs.existsSync(audioFilepath)) {
        fs.unlinkSync(audioFilepath);
      }
    }
  }

  // Step 2: Evaluate answer (always runs)
  try {
    pushSocketUpdate(io, userId, sessionId, "AI_EVALUATION", `Evaluating answer for question ${questionIndex + 1}...`);
    const evalResponse = await fetch(`${AI_SERVICE_URL}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: question.questionText,
        question_type: question.questiontype,
        role: session.role,
        level: session.level,
        user_answer: transcription || "",
        user_code: codeSubmission || "",
      }),
    });
    if (!evalResponse.ok) {
      const errorBody = await evalResponse.text();
      throw new Error(`AI evaluation service error ${evalResponse.status} - ${errorBody}`);
    }
    const evalData = await evalResponse.json();
    question.isEvaluated = true;
    question.userAnswer = transcription;
    question.userSubmittedcode = codeSubmission || "";
    question.idealAnswer = evalData.idealAnswer || question.idealAnswer;
    question.aiFeedback = evalData.aiFeedback || question.aiFeedback;
    question.technicalScore = Math.min(10, Math.max(0, evalData.technicalScore || 0));
    question.confidencescore = Math.min(10, Math.max(0, evalData.confidenceScore || 0));

    const allQuestionsEvaluated = session.questions.every(q => q.isEvaluated);

    if (session.status === "completed" || allQuestionsEvaluated) {
      const scoreSummary = await calculateOverallScore(sessionId);
      session.overallScore = scoreSummary.overallScore;
      session.metrics = {
        avgTechnicalScore: scoreSummary.avgTechnicalScore,
        avgConfidenceScore: scoreSummary.avgConfidenceScore,
      };
      if (allQuestionsEvaluated) {
        session.status = "completed";
        session.endTime = session.endTime || new Date();
      }
      await session.save();
      pushSocketUpdate(io, userId, sessionId, "Session completed", `All questions evaluated`, session);
    } else {
      await session.save();
      pushSocketUpdate(io, userId, sessionId, "Evaluation_completed", `Feedback for question ${questionIndex + 1} is ready`, session);
    }
  } catch (error) {
    console.error(`Evaluation failed: ${error.message}`);
    pushSocketUpdate(io, userId, sessionId, "Evaluation failed", `Error: ${error.message}`);
  }
}



  const submitAnswer=asyncHandler(async(req,res)=>{
    const userId=req.user._id;
    const sessionId=req.params.id;
    const {questionIndex,code}=req.body;
    const session=await Session.findById(sessionId);
    if(!session || session.user.toString()!==userId.toString()){  
      res.status(404);
      throw new Error("Session not found or user unauthorized");
    }
    const questionIndexInt=parseInt(questionIndex,10);
    const question = session.questions[questionIndexInt];
    if(!question){
      res.status(404);
      throw new Error(`Question not found at index ${questionIndexInt}`);
    }
    let audioFilePath=null;
    if(req.file){
      audioFilePath=path.join(process.cwd(),req.file.path);
    }
    const codeSubmission = code || null;



    question.issubmitted=true;
    await session.save();
    res.status(200).json({message:"Answer submitted successfully",status:"Recieved"});

    const io=req.app.get("io");

    evaluateAnswerAsync(
    io,
    userId,
    sessionId,
    questionIndexInt,
    audioFilePath,
    codeSubmission
);
  }) 
  const endSession = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const sessionId = req.params.id;
    const session = await Session.findById(sessionId);

    if (!session || session.user.toString() !== userId.toString()) {
      res.status(404);
      throw new Error("Session not found or user unauthorized");
    }

    const isProcessing = session.questions.some((q) => q.issubmitted && !q.isEvaluated);
    if (isProcessing) {
      res.status(400);
      throw new Error("Cannot end session while evaluation is in progress");
    }

    const scoreSummary = await calculateOverallScore(sessionId);
    session.overallScore = scoreSummary.overallScore;
    session.metrics = {
      avgTechnicalScore: scoreSummary.avgTechnicalScore,
      avgConfidenceScore: scoreSummary.avgConfidenceScore,
    };
    session.status = "completed";
    await session.save();
    const io = req.app.get("io");
    pushSocketUpdate(io, userId, sessionId, "Session ended", "Session has been ended by user", session);
    res.status(200).json({ message: "Session ended successfully", status: "completed", session });
  });



export {
  createSession,
  getSession,
  getSessionById,
  deleteSession,
  submitAnswer,
  endSession,
};