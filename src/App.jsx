import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';
import './App.css';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// --- Utility: Convert File to Generative Part Object ---
async function fileToGenerativePart(file) {
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

// --- Page 1: Home ---
function Home({ setGlobalData }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '', className: '', routine: '', deadline: '', extra: '', syllabusText: ''
  });
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [routineFile, setRoutineFile] = useState(null);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = () => {
    if (!formData.name || (!formData.syllabusText && !syllabusFile)) {
      alert("Please provide at least your name and syllabus (text or PDF).");
      return;
    }
    setGlobalData({ ...formData, syllabusFile, routineFile });
    navigate('/planner');
  };

  return (
    <div className="container">
      <div className="top"><h1>AI Study Planner</h1></div>
      <div className="form-group">
        <h3>Basic Info</h3>
        <input type="text" name="name" placeholder="Your Name" onChange={handleInputChange} />
        <input type="text" name="className" placeholder="Class/Subject" onChange={handleInputChange} />

        <h3>Syllabus (PDF or Text)</h3>
        <input type="file" accept="application/pdf" onChange={(e) => setSyllabusFile(e.target.files[0])} />
        <textarea name="syllabusText" placeholder="Or paste syllabus here..." onChange={handleInputChange} />

        <h3>Daily Routine (Optional PDF or Text)</h3>
        <input type="file" accept="application/pdf" onChange={(e) => setRoutineFile(e.target.files[0])} />
        <textarea name="routine" placeholder="Or describe your schedule..." onChange={handleInputChange} />

        <h3>Exam Deadline</h3>
        <input type="date" name="deadline" onChange={handleInputChange} />

        <div className="field-block extra-context">
          <h3>Anything Else? (Extra Context)</h3>
          <textarea
            name="extra"
            placeholder="e.g. Focus on practical examples, I am weak in Math, keep it light for the first week..."
            onChange={handleInputChange}
          />
        </div>

        <button onClick={handleSubmit} className="submit-btn">Generate Plan</button>
      </div>
    </div>
  );
}

// --- Page 2: Planner ---
function Planner({ globalData }) {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const generatePlan = async () => {
    setLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `
        You are an Academic Coach. Create a study plan for ${globalData.name}.
        Class: ${globalData.className}
        Deadline: ${globalData.deadline}
        Context: ${globalData.extra}
        
        If PDFs are attached, prioritize the information within them for the syllabus and routine.
        If text is provided below, use that:
        Syllabus Text: ${globalData.syllabusText}
        Routine Text: ${globalData.routine}
        
        Provide a structured weekly schedule, study techniques, and milestones.
      `;

      const parts = [{ text: prompt }];

      // Attach PDF parts if they exist
      if (globalData.syllabusFile) {
        parts.push(await fileToGenerativePart(globalData.syllabusFile));
      }
      if (globalData.routineFile) {
        parts.push(await fileToGenerativePart(globalData.routineFile));
      }

      const result = await model.generateContent(parts);
      setResult(result.response.text());
    } catch (error) {
      console.error(error);
      setResult("Failed to generate plan. Please ensure your API Key is valid.");
    } {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!globalData.name) navigate('/');
    else generatePlan();
  }, [globalData]);

  return (
    <div className="container">
      {loading ? (
        <div className="loader">Analyzing documents and generating plan...</div>
      ) : (
        <div className="markdown-output">
          <ReactMarkdown>{result}</ReactMarkdown>
          <button onClick={() => navigate('/')} className="back-btn">Start Over</button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [globalData, setGlobalData] = useState({});
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home setGlobalData={setGlobalData} />} />
        <Route path="/planner" element={<Planner globalData={globalData} />} />
      </Routes>
    </Router>
  );
}