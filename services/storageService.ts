import { SavedLesson } from "../types";

const STORAGE_KEY = 'teachersdhost_lessons';

export const getSavedLessons = (): SavedLesson[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load lessons", e);
    return [];
  }
};

export const saveLessonToStorage = (lesson: SavedLesson): SavedLesson[] => {
  const lessons = getSavedLessons();
  // Check if already exists (update) or new
  const index = lessons.findIndex(l => l.id === lesson.id);
  if (index >= 0) {
    lessons[index] = lesson;
  } else {
    lessons.unshift(lesson);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
  return lessons;
};

export const deleteLessonFromStorage = (id: string): SavedLesson[] => {
  const lessons = getSavedLessons();
  const updatedLessons = lessons.filter(l => l.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLessons));
  return updatedLessons;
};