import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Button } from './components/Button';
import { AppView, LessonPlanState, ImageSize, SavedLesson } from './types';
import { generateNewLessonPlan, generateStyleMatchedPlan, generateVisualAid } from './services/geminiService';
import { getSavedLessons, saveLessonToStorage, deleteLessonFromStorage } from './services/storageService';
import { 
  Pencil, 
  Copy, 
  Upload, 
  Sparkles, 
  ArrowLeft, 
  Download, 
  Image as ImageIcon,
  CheckCircle,
  ExternalLink,
  Save,
  Library,
  Trash2,
  Share2,
  Clipboard,
  FileText,
  Calendar,
  Edit,
  X,
  Check
} from 'lucide-react';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for Create New
  const [grade, setGrade] = useState('7th Grade');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  
  // State for Match Style
  const [file, setFile] = useState<File | null>(null);
  const [newTopic, setNewTopic] = useState('');
  
  // State for Result
  const [result, setResult] = useState<LessonPlanState | null>(null);
  const [visualAidSize, setVisualAidSize] = useState<ImageSize>('1K');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // State for My Lessons
  const [savedLessons, setSavedLessons] = useState<SavedLesson[]>([]);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // State for Editing
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  // Check API Key on mount and load saved lessons
  useEffect(() => {
    const checkKey = async () => {
      setSavedLessons(getSavedLessons());

      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) {
          setView(AppView.HOME);
        } else {
          setView(AppView.LANDING);
        }
      } else {
        setView(AppView.HOME);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) {
          setView(AppView.HOME);
        }
      } catch (e) {
        console.error("Key selection failed", e);
      }
    }
  };

  const handleCreateNew = async () => {
    if (!subject || !topic) return;
    setIsLoading(true);
    setError(null);
    try {
      const { text, groundingUrls } = await generateNewLessonPlan(grade, subject, topic);
      setResult({
        grade,
        subject,
        topic,
        content: text,
        groundingUrls,
        dateCreated: Date.now()
      });
      setIsSaved(false);
      setIsEditing(false);
      setView(AppView.RESULT);
    } catch (e) {
      setError("Something went wrong while drafting the plan. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMatchStyle = async () => {
    if (!file || !newTopic) return;
    setIsLoading(true);
    setError(null);
    try {
      const { text, groundingUrls } = await generateStyleMatchedPlan(file, newTopic);
      setResult({
        topic: newTopic,
        content: text,
        sourceFile: file,
        groundingUrls,
        dateCreated: Date.now()
      });
      setIsSaved(false);
      setIsEditing(false);
      setView(AppView.RESULT);
    } catch (e) {
      setError("Failed to analyze the file or generate the plan. Please ensure the file is readable.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateVisual = async () => {
    if (!result) return;
    setIsGeneratingImage(true);
    setError(null);
    
    if (window.aistudio) {
       const hasKey = await window.aistudio.hasSelectedApiKey();
       if (!hasKey) {
           await window.aistudio.openSelectKey();
       }
    }

    try {
      const imageUrl = await generateVisualAid(result.content, visualAidSize);
      setResult(prev => prev ? { ...prev, generatedImageUrl: imageUrl } : null);
      
      // If the lesson is already saved, update it with the new image
      if (isSaved && result.id) {
          const updatedLesson: SavedLesson = {
              id: result.id,
              topic: result.topic,
              grade: result.grade,
              subject: result.subject,
              content: result.content,
              dateCreated: result.dateCreated || Date.now(),
              groundingUrls: result.groundingUrls,
              generatedImageUrl: imageUrl
          };
          const updatedList = saveLessonToStorage(updatedLesson);
          setSavedLessons(updatedList);
      }
    } catch (e) {
      setError("Visual aid generation failed. Please try again.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSaveLesson = () => {
    if (!result) return;
    
    const newId = result.id || generateId();
    const lessonToSave: SavedLesson = {
      id: newId,
      topic: result.topic,
      grade: result.grade,
      subject: result.subject,
      content: result.content,
      dateCreated: result.dateCreated || Date.now(),
      groundingUrls: result.groundingUrls,
      generatedImageUrl: result.generatedImageUrl
    };
    
    const updatedList = saveLessonToStorage(lessonToSave);
    setSavedLessons(updatedList);
    setResult(prev => prev ? { ...prev, id: newId } : null);
    setIsSaved(true);
  };

  const handleDeleteLesson = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this lesson?")) {
        const updatedList = deleteLessonFromStorage(id);
        setSavedLessons(updatedList);
        // If we are currently viewing this lesson, go back to My Lessons
        if (view === AppView.RESULT && result?.id === id) {
            setView(AppView.MY_LESSONS);
        }
    }
  };

  const handleViewSavedLesson = (lesson: SavedLesson) => {
    setResult({
        id: lesson.id,
        topic: lesson.topic,
        grade: lesson.grade,
        subject: lesson.subject,
        content: lesson.content,
        dateCreated: lesson.dateCreated,
        groundingUrls: lesson.groundingUrls,
        generatedImageUrl: lesson.generatedImageUrl
    });
    setIsSaved(true);
    setIsEditing(false);
    setView(AppView.RESULT);
  };

  const handleStartEditing = () => {
    if (result) {
      setEditContent(result.content);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (result) {
      setResult({ ...result, content: editContent });
      setIsEditing(false);
      setIsSaved(false); // Mark as unsaved because content changed
    }
  };

  const handleCopyToClipboard = () => {
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
      setShowShareOptions(false);
    }
  };

  const handleDownloadTxt = () => {
    if (result?.content) {
      const element = document.createElement("a");
      const file = new Blob([result.content], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `${result.topic.replace(/\s+/g, '-').toLowerCase()}-lesson-plan.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      setShowShareOptions(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setTopic('');
    setSubject('');
    setNewTopic('');
    setFile(null);
    setError(null);
    setIsSaved(false);
    setIsEditing(false);
    setView(AppView.HOME);
  };

  // --- VIEWS ---

  if (view === AppView.LANDING) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
          <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Sparkles size={32} />
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-800 mb-4">Welcome to TeachersDhost</h1>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Your friendly AI colleague for creating engaging lesson plans and visual aids. 
            <br/><br/>
            To get started, please select your API Key.
            <br />
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-xs text-brand-600 underline">Billing Information</a>
          </p>
          <Button onClick={handleSelectKey} fullWidth>
            Select API Key to Begin
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Layout 
        onHomeClick={resetForm} 
        onMyLessonsClick={() => setView(AppView.MY_LESSONS)}
        currentPage={view === AppView.RESULT ? (isSaved ? 'MY_LESSONS' : 'HOME') : view}
    >
      {/* HOME VIEW */}
      {view === AppView.HOME && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-display font-bold text-slate-800 mb-4">
              Hello! What are we working on today?
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              I can help you draft a new lesson from scratch, or create one that perfectly matches your existing materials.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Path 1 Card */}
            <button 
              onClick={() => setView(AppView.CREATE_NEW)}
              className="group relative bg-white p-8 rounded-3xl shadow-sm border-2 border-slate-100 hover:border-brand-200 hover:shadow-xl transition-all duration-300 text-left"
            >
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Pencil size={28} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Create something new</h2>
              <p className="text-slate-500 mb-6">
                Start from scratch. Tell me the grade, subject, and topic, and I'll draft a complete lesson plan for you.
              </p>
              <div className="flex items-center text-brand-600 font-medium">
                Start drafting <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            {/* Path 2 Card */}
            <button 
              onClick={() => setView(AppView.MATCH_STYLE)}
              className="group relative bg-white p-8 rounded-3xl shadow-sm border-2 border-slate-100 hover:border-emerald-200 hover:shadow-xl transition-all duration-300 text-left"
            >
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Copy size={28} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Match my style</h2>
              <p className="text-slate-500 mb-6">
                Upload an old lesson plan you love. I'll analyze its structure and write a new one just like it.
              </p>
              <div className="flex items-center text-emerald-600 font-medium">
                Upload example <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* CREATE NEW VIEW */}
      {view === AppView.CREATE_NEW && (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button onClick={() => setView(AppView.HOME)} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-6 text-sm font-medium">
            <ArrowLeft size={16} /> Back
          </button>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-xl flex items-center justify-center">
              <Pencil size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Draft a New Lesson</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Grade Level</label>
              <select 
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/30 transition-all outline-none"
              >
                {['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', 'High School'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
              <input 
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Life Science, Ancient History"
                className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-white placeholder-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/30 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Today's Topic</label>
              <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Photosynthesis, The Roman Empire"
                className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-white placeholder-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/30 transition-all outline-none"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">
                {error}
              </div>
            )}

            <Button 
              onClick={handleCreateNew} 
              fullWidth 
              isLoading={isLoading}
              disabled={!subject || !topic}
            >
              Draft My Lesson Plan
            </Button>
          </div>
        </div>
      )}

      {/* MATCH STYLE VIEW */}
      {view === AppView.MATCH_STYLE && (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button onClick={() => setView(AppView.HOME)} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-6 text-sm font-medium">
            <ArrowLeft size={16} /> Back
          </button>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <Copy size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Match My Style</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Upload Example Plan</label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative cursor-pointer group">
                <input 
                  type="file" 
                  accept=".pdf,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-2 pointer-events-none">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-emerald-500 transition-colors">
                    {file ? <CheckCircle size={20} className="text-emerald-500" /> : <Upload size={20} />}
                  </div>
                  {file ? (
                    <span className="text-emerald-600 font-medium">{file.name}</span>
                  ) : (
                    <span className="text-slate-500">Click to upload PDF or Text file</span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">New Topic</label>
              <input 
                type="text" 
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="e.g. Gravity, Creative Writing"
                className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-white placeholder-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/30 transition-all outline-none"
              />
              <p className="mt-2 text-xs text-slate-400">
                I'll write a lesson on this topic using the format of the file above.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">
                {error}
              </div>
            )}

            <Button 
              onClick={handleMatchStyle} 
              variant="secondary"
              fullWidth 
              isLoading={isLoading}
              disabled={!file || !newTopic}
            >
              Create New Lesson in This Style
            </Button>
          </div>
        </div>
      )}

      {/* MY LESSONS VIEW */}
      {view === AppView.MY_LESSONS && (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                <Library size={24} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">My Lessons</h2>
            </div>
            <Button onClick={() => setView(AppView.CREATE_NEW)}>
              <Pencil size={18} /> New Draft
            </Button>
          </div>

          {savedLessons.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <Library size={32} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No saved lessons yet</h3>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                Drafts you save will appear here. Start by creating a new lesson plan!
              </p>
              <Button onClick={() => setView(AppView.HOME)} variant="outline">
                Back to Home
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {savedLessons.map(lesson => (
                <div 
                  key={lesson.id}
                  onClick={() => handleViewSavedLesson(lesson)}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all cursor-pointer group relative"
                >
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                     <button 
                       type="button"
                       onClick={(e) => handleDeleteLesson(e, lesson.id)}
                       className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors bg-white shadow-sm border border-slate-100"
                       title="Delete Lesson"
                     >
                       <Trash2 size={16} />
                     </button>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-slate-800 mb-1 line-clamp-1">{lesson.topic}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                       {lesson.grade && <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium text-slate-600">{lesson.grade}</span>}
                       {lesson.subject && <span>• {lesson.subject}</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(lesson.dateCreated).toLocaleDateString()}
                    </div>
                    {lesson.generatedImageUrl && (
                      <div className="flex items-center gap-1 text-indigo-500">
                        <ImageIcon size={12} />
                        Visual Included
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RESULT VIEW */}
      {view === AppView.RESULT && result && (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
             <button onClick={() => setView(AppView.HOME)} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm font-medium">
               <ArrowLeft size={16} /> {isSaved ? 'Back to Home' : 'Start Over'}
             </button>
             
             <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button 
                      onClick={handleCancelEdit} 
                      variant="outline" 
                      className="!px-4 !py-2 !text-sm"
                    >
                      <X size={16} /> Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveEdit} 
                      className="!px-4 !py-2 !text-sm"
                    >
                      <Check size={16} /> Save Changes
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleStartEditing}
                      variant="outline"
                      className="!px-4 !py-2 !text-sm"
                    >
                      <Edit size={16} /> Edit
                    </Button>
                    
                    <div className="relative">
                      <Button 
                        variant="outline" 
                        className="!px-4 !py-2 !text-sm"
                        onClick={() => setShowShareOptions(!showShareOptions)}
                      >
                        <Share2 size={16} /> Share
                      </Button>
                      
                      {showShareOptions && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 p-2 z-20 animate-in fade-in zoom-in-95 duration-200">
                          <button 
                            onClick={handleCopyToClipboard}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                          >
                            <Clipboard size={16} className="text-slate-400" />
                            {copyFeedback ? 'Copied!' : 'Copy to Clipboard'}
                          </button>
                          <button 
                            onClick={handleDownloadTxt}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                          >
                            <FileText size={16} className="text-slate-400" />
                            Download .txt
                          </button>
                        </div>
                      )}
                      {showShareOptions && (
                        <div className="fixed inset-0 z-10" onClick={() => setShowShareOptions(false)}></div>
                      )}
                    </div>

                    <Button 
                      onClick={handleSaveLesson} 
                      variant={isSaved ? "secondary" : "primary"}
                      className="!px-4 !py-2 !text-sm"
                      disabled={isSaved}
                    >
                      {isSaved ? (
                        <>
                          <CheckCircle size={16} /> Saved
                        </>
                      ) : (
                        <>
                          <Save size={16} /> Save Lesson
                        </>
                      )}
                    </Button>
                  </>
                )}
             </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content (Left 2/3) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                 <div className="flex justify-between items-start mb-6">
                   <h2 className="text-2xl font-bold text-slate-800">{result.topic}</h2>
                   <div className="bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
                     Lesson Plan
                   </div>
                 </div>
                 
                 {isEditing ? (
                   <textarea
                     value={editContent}
                     onChange={(e) => setEditContent(e.target.value)}
                     className="w-full min-h-[500px] p-4 rounded-xl border border-slate-200 font-sans leading-relaxed focus:border-brand-500 focus:ring-4 focus:ring-brand-50 outline-none resize-none text-slate-600"
                     placeholder="Edit your lesson plan here..."
                   />
                 ) : (
                   <div className="prose prose-slate max-w-none text-slate-600">
                     {/* Simple rendering preserving whitespace/newlines for structure */}
                     <div className="whitespace-pre-wrap font-sans leading-relaxed">
                       {result.content}
                     </div>
                   </div>
                 )}

                 {/* Grounding Sources */}
                 {result.groundingUrls && result.groundingUrls.length > 0 && (
                   <div className="mt-8 pt-6 border-t border-slate-100">
                     <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Sources & References</h4>
                     <div className="flex flex-wrap gap-2">
                       {result.groundingUrls.map((url, idx) => (
                         <a 
                           key={idx}
                           href={url.uri}
                           target="_blank"
                           rel="noreferrer"
                           className="inline-flex items-center gap-1 text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 px-3 py-2 rounded-lg transition-colors"
                         >
                           <ExternalLink size={12} />
                           <span className="truncate max-w-[200px]">{url.title}</span>
                         </a>
                       ))}
                     </div>
                   </div>
                 )}
              </div>
            </div>

            {/* Visual Aid Sidebar (Right 1/3) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-lg p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <h3 className="font-bold text-lg">Visual Aid</h3>
                </div>
                
                <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                  Want to wow your students? I can generate a custom flowchart for this lesson to project on your screen.
                </p>

                {!result.generatedImageUrl ? (
                  <>
                    <div className="mb-4">
                       <label className="text-xs font-medium text-indigo-200 block mb-2 uppercase tracking-wide">Image Resolution</label>
                       <div className="flex bg-white/10 p-1 rounded-xl backdrop-blur-sm">
                         {(['1K', '2K', '4K'] as ImageSize[]).map((size) => (
                           <button
                             key={size}
                             onClick={() => setVisualAidSize(size)}
                             className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                               visualAidSize === size 
                                 ? 'bg-white text-indigo-600 shadow-sm' 
                                 : 'text-indigo-200 hover:bg-white/5'
                             }`}
                           >
                             {size}
                           </button>
                         ))}
                       </div>
                    </div>

                    <button 
                      onClick={handleGenerateVisual}
                      disabled={isGeneratingImage}
                      className="w-full bg-white text-indigo-600 font-bold py-3 rounded-xl shadow-lg hover:shadow-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isGeneratingImage ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Designing...
                        </>
                      ) : (
                        <>
                          <ImageIcon size={18} />
                          Visualize This
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                    <div className="rounded-xl overflow-hidden border-2 border-white/20 shadow-md bg-white">
                      <img 
                        src={result.generatedImageUrl} 
                        alt="Lesson Flowchart" 
                        className="w-full h-auto object-cover"
                      />
                    </div>
                    <a 
                      href={result.generatedImageUrl} 
                      download={`lesson-visual-${result.topic.replace(/\s+/g, '-').toLowerCase()}.png`}
                      className="w-full bg-indigo-700/50 hover:bg-indigo-700/70 text-white font-medium py-2 rounded-xl border border-indigo-400/30 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <Download size={16} />
                      Download Image
                    </a>
                    <button
                        onClick={() => setResult(prev => prev ? { ...prev, generatedImageUrl: undefined } : null)}
                        className="w-full text-indigo-200 text-xs hover:text-white transition-colors"
                    >
                        Generate New Version
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;