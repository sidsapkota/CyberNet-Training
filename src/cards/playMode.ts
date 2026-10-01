"use client";
import { createContext, useContext } from "react";

/**
 * Where a card is being played. Quizzes are one try, so a card must not show a live result before
 * Check there (train_model's guess flip, for one). Lessons, Mistake review and teasers are "lesson".
 */
export const PlayModeContext = createContext<"lesson" | "quiz">("lesson");
export const usePlayMode = () => useContext(PlayModeContext);
